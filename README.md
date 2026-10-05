# 松果办公室 · Pixel Agent Office

> 把 AI Agent 放进一间会动的俯视像素办公室：你说出目标，它们决定怎么分工、走到工位执行，并把过程与结果呈现在你眼前。

**本机运行 · AI 自动分工 · 多 Agent 协作 · 自由配置小队 · 原创像素场景**

[English](README.en.md) · [快速开始](#快速开始) · [接入 Agent](#接入-agent) · [配置与更新](#配置与更新) · [常见问题](#常见问题) · [MIT 许可证](LICENSE)

## 这是什么

松果办公室是一个开源的 **AI Agent 可视化工作台**。它把“发任务、选执行器、看进度”做成一间有角色、有工位、有房间设施的像素办公室。你不用先决定任务该交给一人还是多人：默认由已配置的 Agent 分析任务，再选择独立处理、依次接力或并行协作。

例如输入“做一个待办网页并写使用说明”，小队会先给出分工判断。执行时，角色会在办公室里移动、坐到工位；任务卡会展示使用了哪个 Agent、为什么这样分工、各成员的步骤与交接内容。做完后可查看和复制结果，也能打开工作区查看生成的文件。

![松果办公室主界面：俯视像素场景、任务输入、小队成员和进度面板](docs/screenshot.png)

*预览图取自空数据的独立实例；运行界面会根据你的成员、任务和设置变化。*

## 功能一览

| 你能做什么 | 具体体验 |
| --- | --- |
| **一句话派任务** | 输入目标后点击“交给小队”。任务内容不限于预设类型；实际能力取决于所绑定的 Agent。 |
| **让 AI 决定分工** | Agent 先判断复杂度，再安排一人独立处理、小队接力或并行。任务卡显示判断理由；明显的单句、短答任务优先交给一人。 |
| **看见协作过程** | 成员走到工位并坐下工作。右侧实时展示进度、活动记录、各步骤输出、交接内容和最终结果；可以停止正在运行的任务。 |
| **自由组建小队** | 支持 1–8 位成员。名字、职位、专长、自动派工词、个人要求、动物角色、颜色和使用的 Agent 都可修改。 |
| **接入不同 Agent** | 提供 Ollama、Codex、Claude Code、Hermes、DeepSeek、OpenRouter、OpenAI API 的接入入口，也能添加兼容 API、自定义 HTTP JSON 接口或本地命令行 Agent。 |
| **探索办公室** | 点击角色和房间设施：黑板记计划，会议桌安排协作，书架查看工作区文件，茶水间调昼夜，休息角直接和成员交谈。 |
| **打造自己的场景** | 修改办公室名称、副标题、门牌、Emoji 或图片 LOGO、快捷任务、昼夜、角色闲逛与短任务动画时长；场景可全屏。 |

### 自动分工与手动控制

默认流程是 **分析任务 → 选择成员与协作方式 → 执行 → 展示结果**。自动分工最多安排三名成员：

- **独立处理**：一位成员完成任务，适合单一、简短的交付物。
- **小队接力**：前一位的输出成为下一位的上下文，适合有先后依赖的工作。
- **小队并行**：成员同时处理不同部分，最后由主办成员综合结果。

如果调度回答无法解析，系统会交给原本选中的成员独立处理，并在任务卡说明。你也可以展开 **“派工设置（可选）”**，亲自指定成员、执行器和协作方式。一次只运行一个顶层任务。

### 房间里的交互

- **点击角色**：看名字、专长、正在使用的 Agent 和参与过的任务，并给这位成员派工。
- **黑板“计划”**：添加、完成或删除便签，查看最近任务。
- **会议桌“开会”**：回到任务输入区，让 AI 自动分工，或手动选择接力、并行。
- **书架“文件”**：刷新工作区文件列表，预览小型文本文件。
- **茶水间“茶水”**：选择跟随本机时间、白天或夜晚。
- **休息角“聊天”**：给指定成员发一项真实任务并在任务卡查看答复。

桌面主界面适配常见窗口尺寸，长结果在任务卡内部滚动；窄屏改为纵向布局。

## 快速开始

### 1. 准备环境

| 环境 | 要求 |
| --- | --- |
| Node.js | **20 或更新版本**，可从 [Node.js 官网](https://nodejs.org/)安装。 |
| Git | 使用命令下载仓库时需要；下载 ZIP 可省略。 |
| Agent / 模型服务 | 从下方接入方式中选择至少一种，完成配置后才能执行真实任务。 |

在终端检查 Node.js：

```sh
node --version
```

版本号应为 `v20` 或更高。项目没有运行时 npm 依赖，下载后可以直接启动。

### 2. 下载项目

在你希望存放项目的文件夹中打开终端，运行：

```sh
git clone https://github.com/vmayfuture/pixel-agent-office.git
cd pixel-agent-office
```

也可以 [下载 ZIP](https://github.com/vmayfuture/pixel-agent-office/archive/refs/heads/main.zip) 并解压。使用 ZIP 时，请在解压后的项目文件夹中打开终端，确认能看到 `server.mjs` 和 `package.json`。

### 3. 启动办公室

以下命令都在 **项目文件夹内** 执行，按你的系统选择一种。

**Windows · PowerShell**

```powershell
.\启动办公室.cmd
```

也可以在文件夹里双击 [启动办公室.cmd](启动办公室.cmd)，它会自动打开浏览器。

**macOS / Linux · Terminal**

```bash
node server.mjs
```

**通用启动方式 · 已安装 npm 时可选**

```sh
npm start
```

启动成功后，终端会显示类似信息：

```text
像素办公室已启动：http://127.0.0.1:4321
Agent 工作区：…/pixel-agent-office/workspace
```

在浏览器打开 **[http://127.0.0.1:4321](http://127.0.0.1:4321)**。保持启动服务的终端运行。

### 4. 接入 Agent 并派发任务

1. 点击右上角 **“自定义 → 接入 Agent”**。
2. 按下面的 [接入指南](#接入-agent)选择一个已经安装或配置好的 Agent / 模型服务。
3. 启用它，点击 **“让全部成员使用”**，或分别指定每位成员，然后 **保存设置**。
4. 回到主界面，输入任务，点击 **“交给小队”**。默认由 AI 判断是否需要协作。

> 首次使用只需配置一种接入方式。页面能打开表示办公室服务已启动；执行任务还需要配置可用的 Agent。

## 接入 Agent

根据你准备使用的服务，进入对应章节。下面的安装命令用于安装各自的 Agent，办公室通过本机命令或 API 调用它们。

| 接入指南 | 需要准备 | 能做什么 |
| --- | --- | --- |
| **[Ollama 本地模型](#ollama-本地模型)** | 已运行的 Ollama 与已下载的模型 | 页面列出本地模型，可自动选择。 |
| **[Codex](#codex)** | 已安装、已登录的 Codex CLI | 使用 Codex 的工具和本机文件能力。 |
| **[Claude Code](#claude-code)** | 已安装、已登录的 Claude Code CLI | 使用 Claude Code 获准的文件编辑与工具能力。 |
| **[Hermes Agent](#hermes-agent)** | 能在终端独立运行的 Hermes | 使用 Hermes 的模型、工具和内部子代理。 |
| **[云端 API](#云端-api)** | 服务商的 API Key 和模型 ID | 支持 DeepSeek、OpenRouter、OpenAI API 和兼容服务。 |
| **[其他 Agent / API](#其他-agent--api)** | 本机命令或服务商接口文档 | 自定义命令行、HTTP JSON 或兼容 API。 |

新安装命令行 Agent 后，请打开新终端并重启办公室，让服务读取更新后的 PATH。每位成员可以绑定不同的 Agent。

### Ollama 本地模型

**安装并启动服务**

按 [Ollama 官方说明](https://docs.ollama.com/quickstart)安装。Windows / macOS 安装后打开 Ollama 应用；Linux 如果服务尚未运行，在一个终端执行并保持运行：

```sh
ollama serve
```

**下载模型并检查**

在另一个终端运行。下面以 [Qwen3 4B](https://ollama.com/library/qwen3:4b)为例，也可以使用其他已下载的模型：

```sh
ollama --version
ollama pull qwen3:4b
ollama list
```

**在办公室中接入**

进入 **“自定义 → 接入 Agent → 本地模型”**，选择列表中的模型或“自动选可用模型”，启用并分给成员后保存。默认地址为 `http://127.0.0.1:11434`，无需 API Key。

### Codex

**安装 · Windows PowerShell**

```powershell
irm https://chatgpt.com/codex/install.ps1 | iex
```

**安装 · macOS / Linux**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

安装方式来源于 [OpenAI 官方 Codex CLI 文档](https://learn.chatgpt.com/docs/codex/cli)。已经安装 CLI 的用户可直接进行下一步。

**登录**

在新终端中运行，按提示完成登录：

```sh
codex login
```

**检查安装与登录状态**

```sh
codex --version
codex login status
```

**在办公室中接入**

进入 **“自定义 → 接入 Agent → Codex”**，启用并分给成员后保存。办公室使用本机 CLI 的登录和配置，在 `workspace/` 中执行任务。

### Claude Code

**安装 · Windows PowerShell**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**安装 · macOS / Linux**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

其他安装方式见 [Claude Code 官方安装说明](https://code.claude.com/docs/en/setup)。已经安装 CLI 的用户可直接进行下一步。

**登录**

在新终端中运行：

```sh
claude auth login
```

**检查安装与登录状态**

```sh
claude --version
claude auth status
```

**在办公室中接入**

进入 **“自定义 → 接入 Agent → Claude Code”**，启用并分给成员后保存。使用本机登录，无需在办公室填写 API Key。任务在 `workspace/` 中运行，预设允许文件编辑，其他工具遵循 Claude Code 的权限设置。

办公室负责小队的独立处理、接力和并行；Claude Code 可自行使用已配置的内部子代理，其内部步骤暂不单独显示成办公室角色。连接状态检查安装与登录，任务是否完成还取决于账户和工具权限。

### Hermes Agent

**安装 · Windows PowerShell**

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

**安装 · macOS / Linux**

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

平台要求和其他安装方式见 [Hermes 官方安装说明](https://hermes-agent.nousresearch.com/docs/getting-started/installation)。已经有可运行的 Hermes 可直接进行下一步。

**配置模型与工具**

在新终端中运行，按向导选择模型服务并完成配置：

```sh
hermes setup
```

**验证能独立完成任务**

```sh
hermes -z "用一句话介绍自己"
```

**在办公室中接入**

进入 **“自定义 → 接入 Agent → Hermes”**，启用并分给成员后保存。Hermes 的内部子代理由它自己管理。特殊启动脚本可在“高级接入设置”中配置；若使用 WSL，请在同一 WSL 环境中启动办公室和 Hermes。

### 云端 API

云端 API 在界面中配置：

1. 打开 **“自定义 → 接入 Agent → 云端 API”**。
2. 选择服务商模板。
3. 粘贴服务商提供的 API Key，确认模型 ID；使用“其他兼容服务”时同时填写基础地址。
4. 启用并分给成员，保存设置。

| 服务商 | 预填的基础地址 | 模型 ID |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | 可修改预填模型。 |
| OpenRouter | `https://openrouter.ai/api/v1` | 从服务商模型列表复制。 |
| OpenAI API | `https://api.openai.com/v1` | 可修改预填模型。 |
| 其他兼容服务 | 自行填写 | 按服务商文档填写。 |

API Key 与 ChatGPT 网页登录是不同凭据。此接入方式发送 Chat Completions 文本请求；需要本机文件或工具能力时，可绑定支持这些能力的命令行 Agent。

### 其他 Agent / API

打开 **“自定义 → 高级接入设置”**，选择“本地命令 Agent”“自定义 HTTP JSON”或“OpenAI 兼容 API”。按对应 Agent / 服务商的官方文档填写启动命令或接口。

本地命令的参数每行一个；任务内容用 `{{prompt}}` 占位，工作目录可用 `{{workspace}}` 占位。命令在本项目的 `workspace/` 中启动。

## 配置与更新

### 更改端口

默认只监听本机 `127.0.0.1:4321`。如需使用 `4322`，先停止当前办公室，再在项目文件夹中运行：

**Windows · PowerShell**

```powershell
$env:PIXEL_OFFICE_PORT = "4322"
node server.mjs
```

**macOS / Linux · Terminal**

```bash
PIXEL_OFFICE_PORT=4322 node server.mjs
```

然后打开 **[http://127.0.0.1:4322](http://127.0.0.1:4322)**。

### 停止与更新

停止：在运行服务的终端按 **Ctrl+C**，或关闭该终端。

通过 Git 下载的项目，停止服务后在项目文件夹运行：

```sh
git pull --ff-only
```

完成后按上面的 [启动步骤](#3-启动办公室)重新启动。通过 ZIP 下载的项目可下载新版，保留自己的 `data/` 和 `workspace/` 文件夹。

## 自定义与本地数据

在设置中可修改：

- **品牌与场景**：办公室名称、门牌、副标题、LOGO、昼夜、闲逛和动画时长。
- **小队成员**：人数、顺序、名字、专长、派工词、个人要求、外观与绑定的 Agent。
- **快捷任务**：任务按钮的名称、提示词、成员和执行器。
- **高级接入**：添加多个执行器，配置接口、请求格式、命令参数和长期要求。

设置保存在 `data/settings.json`；API Key 单独保存在 `data/provider-secrets.json`，页面状态接口不会返回完整密钥。任务历史与黑板便签分别保存在 `data/tasks.json`、`data/board.json`；命令行 Agent 的工作目录是 `workspace/`。这些目录已被 Git 忽略，**不要把个人数据或密钥提交到公开仓库**。

## 常见问题

| 现象 | 处理方法 |
| --- | --- |
| 提示找不到 Node.js | 安装 Node.js 20 或更新版本，再打开新终端。 |
| 页面已打开，但任务执行失败 | 确认 Agent 在终端中可运行，并已启用、分配给成员和保存。 |
| 已安装 Agent，办公室仍提示未连接 | 打开新终端验证命令，再重启办公室；特殊安装可在高级设置中填写可执行程序的完整路径。 |
| Ollama 没有可选模型 | 确认服务运行，完成模型下载，并检查模型列表。 |
| Claude Code 显示未登录 | 按 [Claude Code 登录步骤](#claude-code)登录并检查状态。 |
| 端口被占用 | 按 [更改端口](#更改端口)启动，并访问新端口对应的网址。 |

## 当前边界

- AI 分工可能判断失误；需要固定流程时可使用手动派工。
- Claude Code 和 Hermes 需要先在本机安装并能独立运行；本项目不安装或修复它们。Hermes 特殊安装可在高级设置中指定启动命令，或设置 `PIXEL_OFFICE_HERMES_SCRIPT`。
- 兼容 API 目前使用 Chat Completions；其他协议需按服务商文档配置高级 HTTP 接入。
- 自定义命令行 Agent 以本机用户身份运行，请只配置你信任的命令，并确认对应服务的费用与权限。

场景和角色为原创像素绘制，没有使用《星露谷物语》或其他产品的游戏素材。项目采用 [MIT 许可证](LICENSE)。

**相关关键词：** AI Agent 可视化、像素办公室、多 Agent 协作、自动分工、俯视像素、agent visualization、pixel art AI workspace、multi agent dashboard、Ollama、Codex、Claude Code、Hermes。
