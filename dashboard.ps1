# QwenCode Dashboard 启动器
# 在浏览器中打开可视化仪表盘

param([int]$Port = 9876)

$DASHBOARD_SCRIPT = Join-Path (Split-Path $PSCommandPath -Parent) "dashboard.js"

Write-Host @"

╔══════════════════════════════════════╗
║  QwenCode Bridge · Dashboard        ║
║  启动中...                          ║
╚══════════════════════════════════════╝

"@ -ForegroundColor Cyan

# 自动打开浏览器
Start-Sleep -Seconds 1
Start-Process "http://localhost:$Port"

# 启动仪表盘服务
node $DASHBOARD_SCRIPT
