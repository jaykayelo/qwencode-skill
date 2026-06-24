<#
.SYNOPSIS
  QwenCode Bridge — Claude 下指令，Qwen Code 执行 + 进度可视化
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Prompt,

    [Parameter(Position=1)]
    [string]$Model = "qwen3:8b-fast",

    [Parameter(Position=2)]
    [string]$WorkDir = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$STATUS_DIR = "$env:USERPROFILE\.qwencode"
$STATUS_FILE = "$STATUS_DIR\status.json"
$HISTORY_DIR = "$STATUS_DIR\history"

# 初始化状态目录
New-Item -ItemType Directory -Force -Path $STATUS_DIR, $HISTORY_DIR | Out-Null

# 状态写入函数
function Write-Status {
    param([string]$Phase, [string]$Message, [int]$Progress)
    $status = @{
        taskId     = $TASK_ID
        phase      = $Phase
        message    = $Message
        progress   = $Progress
        model      = $Model
        workDir    = $WorkDir
        prompt     = ($Prompt.Substring(0, [Math]::Min(80, $Prompt.Length)) + "...")
        startedAt  = $STARTED_AT
        updatedAt  = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        pid        = $PID
    } | ConvertTo-Json -Compress
    $status | Set-Content $STATUS_FILE -Force -Encoding UTF8
}

function Write-History {
    param([string]$Result, [int]$ExitCode)
    $entry = @{
        taskId    = $TASK_ID
        prompt    = $Prompt
        model     = $Model
        workDir   = $WorkDir
        startedAt = $STARTED_AT
        endedAt   = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        exitCode  = $ExitCode
        result    = ($Result.Substring(0, [Math]::Min(500, $Result.Length)))
    } | ConvertTo-Json -Compress
    $entry | Set-Content "$HISTORY_DIR\$TASK_ID.json" -Force -Encoding UTF8
}

# 任务 ID
$TASK_ID = "task-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$(Get-Random -Min 1000 -Max 9999)"
$STARTED_AT = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$SCRIPT_START = Get-Date

Write-Status -Phase "init" -Message "启动工作流..." -Progress 0

# 依赖检查
Write-Status -Phase "check" -Message "检查依赖..." -Progress 5
if (-not (Get-Command qwen -ErrorAction SilentlyContinue)) {
    Write-Status -Phase "error" -Message "Qwen Code 未安装" -Progress 100
    throw "Qwen Code 未安装"
}
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Status -Phase "error" -Message "Ollama 未安装" -Progress 100
    throw "Ollama 未安装"
}

# 确认 Ollama 在线
Write-Status -Phase "connect" -Message "连接 Ollama 服务..." -Progress 10
$ollamaOk = ollama list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Status -Phase "connect" -Message "启动 Ollama 服务中..." -Progress 12
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# 确认模型就绪
Write-Status -Phase "model" -Message "加载模型: $Model" -Progress 15
$models = ollama list 2>&1 | Out-String
if ($models -notmatch $Model) {
    Write-Status -Phase "model" -Message "拉取模型: $Model (请耐心等待...)" -Progress 18
    ollama pull $Model 2>&1 | Out-Null
}

# 显示信息
$box = @"

╔══════════════════════════════════════╗
║  Claude → Qwen Code 工作流         ║
╠══════════════════════════════════════╣
║  任务: $TASK_ID
║  模型: $Model
║  目录: $WorkDir
║  仪表盘: http://localhost:9876
╚══════════════════════════════════════╝
"@
Write-Host $box

# 启动执行
Write-Status -Phase "running" -Message "Qwen Code 执行中..." -Progress 25
Push-Location $WorkDir

try {
    $output = & {
        qwen -y -m $Model -o text $Prompt 2>&1
    }

    $exitCode = $LASTEXITCODE
    $elapsed = [math]::Round(((Get-Date) - $SCRIPT_START).TotalSeconds, 1)

    if ($exitCode -eq 0 -and $output) {
        Write-Status -Phase "done" -Message "执行完成 (${elapsed}s)" -Progress 100
        Write-Host "`n[qwencode] ✓ 完成 (${elapsed}s)"
        Write-History -Result ($output -join "`n") -ExitCode 0
        return $output
    } else {
        Write-Status -Phase "failed" -Message "执行失败 (${elapsed}s)" -Progress 100
        Write-Host "`n[qwencode] ✗ 失败 (${elapsed}s)"
        Write-History -Result ($output -join "`n") -ExitCode $exitCode
        exit 1
    }
} finally {
    Pop-Location
}
