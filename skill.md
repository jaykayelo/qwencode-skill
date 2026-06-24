---
name: qwencode
description: >
  Claude 思考规划 + 本地 Qwen3 执行。当用户需要创建文件、写代码、
  生成网页、重构代码时，Claude 负责拆解需求并下指令，Qwen Code 
  通过本地 Ollama 模型免费执行。适用：写代码、生成文件、创建项目。
---

# QwenCode Bridge Skill

## 架构

```
用户 → Claude Code (大脑·规划) → qwencode.ps1 → Qwen Code (手脚·执行)
       DeepSeek API 推理           桥接脚本       本地 Ollama qwen3:8b-fast
```

## 工作方式

**Claude 的职责：**
1. 理解用户需求
2. 拆解为可执行的任务
3. 写出清晰的指令传递给 Qwen Code
4. 审核 Qwen Code 的产出

**Qwen Code 的职责：**
1. 接收 Claude 的指令
2. 调用本地工具（写文件、执行命令）
3. 返回结果

## 使用方法

当用户提出代码执行类任务时，调用 qwencode 脚本：

```powershell
# 基本用法
.\qwencode-skill\qwencode.ps1 "<清晰的执行指令>"

# 指定模型
.\qwencode-skill\qwencode.ps1 "<指令>" qwen3:8b-fast

# 指定工作目录
.\qwencode-skill\qwencode.ps1 "<指令>" qwen3:8b-fast "D:\my-project"
```

## 指令编写原则

好的指令应该：
- **具体**：文件名、路径、功能点写清楚
- **结构化**：技术栈、UI样式、数据格式明确标注
- **可验证**：写清楚预期产出是什么

示例：
```
在 D:\project 创建 app.html：
1. 深色主题，响应式布局
2. 包含导航栏、侧边栏、主内容区
3. 用 CSS Grid 布局
4. 添加一个暗色模式切换按钮
```

## 安装

```powershell
# 1. Clone 本仓库
git clone https://github.com/jaykayelo/qwencode-skill.git

# 2. 确保依赖就绪
npm install -g @qwen-code/qwen-code
ollama pull qwen3:8b-fast

# 3. 验证
.\qwencode-skill\qwencode.ps1 "在桌面创建 test.txt，内容为 hello"
```

## 依赖

| 组件 | 用途 |
|------|------|
| Qwen Code CLI (`qwen`) | 千问编程助手 |
| Ollama + qwen3:8b-fast | 本地推理（免费） |
| PowerShell 5.1+ | 脚本运行环境 |
