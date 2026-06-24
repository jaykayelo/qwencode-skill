<# QwenCode Bridge - Claude thinks, Qwen executes #>
param(
    [Parameter(Mandatory=$true)][string]$Prompt,
    [string]$Model = "qwen3:8b-fast",
    [string]$WorkDir = (Get-Location).Path
)
$ErrorActionPreference = "Continue"
$SD  = "$env:USERPROFILE\.qwencode"
$SF  = "$SD\status.json"
$HD  = "$SD\history"
$TID = "task-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-" + (Get-Random -Min 1000 -Max 9999)
$STA = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$SW  = [System.Diagnostics.Stopwatch]::StartNew()
New-Item -ItemType Directory -Force -Path $SD, $HD | Out-Null

$PP = $Prompt; if ($Prompt.Length -gt 60) { $PP = $Prompt.Substring(0, 60) + "..." }

# helper to write status JSON
filter WriteS($P,$M,$G) {
    $O = [ordered]@{taskId=$TID;phase=$P;message=$M;progress=$G;model=$Model;workDir=$WorkDir;prompt=$PP;startedAt=$STA;updatedAt=(Get-Date -Format 'HH:mm:ss')}
    $O | ConvertTo-Json -Compress | Set-Content $SF -Force -Encoding UTF8
}

"init"   | WriteS "Starting..."         2
"check"  | WriteS "Checking deps..."     8
if (-not (Get-Command qwen -ErrorAction SilentlyContinue)) {
    "error" | WriteS "Qwen Code not found" 100
    throw "Install: npm install -g @qwen-code/qwen-code"
}

"connect" | WriteS "Connecting Ollama..." 15
$tmp = ollama list 2>&1
if ($LASTEXITCODE -ne 0) {
    "connect" | WriteS "Starting Ollama..." 18
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

"model"   | WriteS "Model: $Model"        22
"running" | WriteS "Qwen Code running..."  30

Write-Host ""
Write-Host "  ========================================"
Write-Host "   Claude -> Qwen Code Bridge"
Write-Host "  ========================================"
Write-Host ("   Task : " + $TID)
Write-Host ("   Model: " + $Model)
Write-Host ("   Panel: http://localhost:9876")
Write-Host "  ========================================"
Write-Host ""

Push-Location $WorkDir
try {
    $raw = qwen -y -m $Model -o text $Prompt 2>&1
    $ec  = $LASTEXITCODE
    $SW.Stop()
    $el  = [math]::Round($SW.Elapsed.TotalSeconds, 1)

    if ($ec -eq 0) {
        "done" | WriteS "Done (${el}s)" 100
        Write-Host ("`n  [qwencode] OK (" + $el + "s)")
        $H = [ordered]@{taskId=$TID;prompt=$Prompt;model=$Model;workDir=$WorkDir;startedAt=$STA;endedAt=(Get-Date -Format 'HH:mm:ss');exitCode=0;elapsed=$el}
        $H | ConvertTo-Json -Compress | Set-Content "$HD\$TID.json" -Force -Encoding UTF8
        return $raw
    } else {
        "failed" | WriteS "Failed (${el}s)" 100
        Write-Host ("`n  [qwencode] FAIL (exit " + $ec + ")")
        $H = [ordered]@{taskId=$TID;prompt=$Prompt;model=$Model;workDir=$WorkDir;startedAt=$STA;endedAt=(Get-Date -Format 'HH:mm:ss');exitCode=$ec;elapsed=$el}
        $H | ConvertTo-Json -Compress | Set-Content "$HD\$TID.json" -Force -Encoding UTF8
        Write-Host $raw
        exit $ec
    }
} finally { Pop-Location }
