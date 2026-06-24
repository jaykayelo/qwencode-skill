# QwenCode Bridge Skill

> Claude 动脑，Qwen 动手 — 本地免费执行工作流

## 是什么

这是一个 Claude Code Skill，让 Claude Code 将执行任务委托给本地 Qwen Code（基于 Ollama 的千问模型）。

**Claude Code** → 大脑：理解需求、拆解任务、写指令  
**Qwen Code** → 手脚：写代码、创建文件、执行命令  
**成本**：推理用 DeepSeek API（省 token），执行走本地 Ollama（免费）

## 快速开始

```powershell
# 1. 安装依赖
npm install -g @qwen-code/qwen-code
ollama pull qwen3:8b-fast

# 2. Clone 本仓库
git clone https://github.com/jaykayelo/qwencode-skill.git

# 3. 运行
.\qwencode-skill\qwencode.ps1 "在 D:\test 创建一个 hello world 网页"
```

## 效果对比

| | 纯 Claude 写代码 | Claude + QwenCode |
|---|---|---|
| 输出 token | 2000+ | ~200 |
| 执行成本 | 按 token 计费 | 本地免费 |
| 大型任务 | token 线性增长 | token 固定（只花指令） |

## 文件结构

```
qwencode-skill/
├── qwencode.ps1    # 桥接脚本
├── skill.md         # Claude Code Skill 定义
└── README.md        # 本文件
```

## 模型说明

| 模型 | 速度 | 适用 |
|------|------|------|
| `qwen3:8b-fast` | ⚡ 快 | 日常代码生成 |
| `qwen3:8b` | 🐢 慢（带推理链） | 复杂逻辑 |
