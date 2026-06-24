# QwenCode Bridge Skill

> Claude 动脑，Qwen 动手 — 本地免费执行 + 实时进度可视化

## 🎯 是什么

这是一个 Claude Code Skill，让 Claude Code 将代码执行任务委托给本地 Qwen Code（基于 Ollama 千问模型），并配有 **实时进度仪表盘**。

```
Claude Code  →  qwencode.ps1  →  Qwen Code  →  产出文件
  (大脑)         (桥接)          (手脚)       
    ↓
 dashboard.js → 浏览器实时看进度
```

## 🚀 快速开始

```powershell
# 1. 安装依赖
npm install -g @qwen-code/qwen-code
ollama pull qwen3:8b-fast

# 2. Clone
git clone https://github.com/jaykayelo/qwencode-skill.git

# 3. 启动仪表盘
.\qwencode-skill\dashboard.ps1

# 4. 开另一个终端，跑任务
.\qwencode-skill\qwencode.ps1 "创建一个天气预报网页"
```

打开 **http://localhost:9876** 实时查看进度。

## 📊 仪表盘功能

- 🟢 实时进度条 + 6 步阶段指示器
- 📋 任务历史记录（最近 20 条）
- ⏱ 执行耗时统计
- 🔄 每秒自动刷新

## 📁 文件结构

```
qwencode-skill/
├── qwencode.ps1     # 桥接脚本（状态写入 + 执行）
├── dashboard.js      # Node.js 仪表盘服务器
├── dashboard.ps1     # 仪表盘一键启动器
├── skill.md          # Claude Code Skill 定义
└── README.md
```

## 📊 效果对比

| | 纯 Claude | Claude + QwenCode |
|---|---|---|
| 输出 token | 2000+ | ~200 |
| 执行成本 | 按 token 计费 | 本地免费 |
| 进度可见 | ❌ | ✅ 仪表盘 |

## 🔧 模型

| 模型 | 说明 |
|------|------|
| `qwen3:8b-fast` | ⚡ 无推理链，快速执行（推荐） |
| `qwen3:8b` | 🐢 带推理链，质量更高 |
