<#
.SYNOPSIS
  QwenCode Bridge — Claude 下指令，Qwen Code 执行
.DESCRIPTION
  Claude Code 通过此脚本将执行任务委托给本地 Qwen Code + Ollama 模型。
  架构：Claude(大脑/规划) → Qwen Code(手脚/执行)
.PARAMETER Prompt
  要执行的指令描述
.PARAMETER Model
  使用的 Ollama 模型 (默认 qwen3:8b-fast)
.PARAMETER WorkDir
  工作目录 (默认当前目录)
.EXAMPLE
  ./qwencode.ps1 "创建一个 todo app 的 HTML 文件"
  ./qwencode.ps1 -Model qwen3:8b -Prompt "重构 src/utils.js"
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

# 检查依赖
if (-not (Get-Command qwen -ErrorAction SilentlyContinue)) {
    Write-Error "Qwen Code 未安装。请运行: npm install -g @qwen-code/qwen-code"
    exit 1
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Error "Ollama 未安装。请访问: https://ollama.com"
    exit 1
}

# 确保 Ollama 服务运行
$ollamaRunning = ollama ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[qwencode] 启动 Ollama 服务..."
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

Write-Host "╔══════════════════════════════════════╗"
Write-Host "║  Claude → Qwen Code 工作流         ║"
Write-Host "╠══════════════════════════════════════╣"
Write-Host "║  模型: $Model"
Write-Host "║  目录: $WorkDir"
Write-Host "║  指令: $($Prompt.Substring(0, [Math]::Min(40, $Prompt.Length)))..."
Write-Host "╚══════════════════════════════════════╝"

Push-Location $WorkDir
try {
    $result = qwen -y -m $Model -o text $Prompt 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host "`n[qwencode] ✓ 执行完成"
        return $result
    } else {
        Write-Error "[qwencode] ✗ 执行失败 (exit code: $exitCode)"
        Write-Host $result
        exit $exitCode
    }
} finally {
    Pop-Location
}
