# 松果办公室 · Pixel Agent Office

[English](README.en.md) · [许可证](LICENSE)

**一间会工作的俯视像素 AI 办公室。** 输入任务后，AI 会先判断是否需要拆解，再自动安排一位成员独立完成、小队接力或并行协作。你能在场景和任务卡片里看到成员移动、坐到工位、分工理由、交接过程和结果。

![松果办公室的干净预览图](docs/screenshot.png)

## 适合谁

想用一个可视化界面管理本机或云端 AI Agent，又不想先研究 JSON、命令参数和多 Agent 流程的人。桌面版主画面在一个屏幕内；任务结果在卡片内部滚动。窄屏会改用纵向布局。

## 3 分钟开始

需要 **Node.js 20 或更新版本**。项目没有运行时 npm 依赖，无需 `npm install`。

1. 下载仓库 ZIP 并解压，或运行 `git clone https://github.com/vmayfuture/pixel-agent-office.git`。
2. Windows 双击 **启动办公室.cmd**。macOS / Linux 在项目目录运行 `node server.mjs`；也可以使用 `npm start`。
3. 浏览器打开 <http://127.0.0.1:4321>。点击右上角 **自定义 → 接入 Agent**，选一个已经可用的服务，按页面提示设置，保存。
4. 在右侧写下任何任务，点击 **交给小队**。默认由 AI 判断是否需要协作。

程序只监听 `127.0.0.1`。关闭运行它的终端即可停止。默认端口为 `4321`，可用环境变量 `PIXEL_OFFICE_PORT` 修改。

## 接入 Agent

| 选择 | 你需要准备 | 说明 |
| --- | --- | --- |
| Ollama 本地模型 | 已运行的 Ollama 和已下载的模型 | 页面会显示检测到的模型，可让它自动选择。 |
| Codex | 已安装且已登录的 Codex CLI | 可处理需要文件和工具的任务。 |
| Hermes Agent | 已安装且能在终端运行的 Hermes | 可以使用 Hermes 自身的能力；其内部子代理由 Hermes 管理。 |
| DeepSeek、OpenRouter、OpenAI API | 对应服务商的 API Key，必要时选模型 ID | 在“云端 API”里选模板，地址会自动填写。API 用的是 `/chat/completions` 接口。 |
| 其他 Agent / API | 服务商文档或本机命令 | 在 **高级接入设置** 增加兼容 API、自定义 HTTP JSON 或命令行 Agent。 |

云端 API Key 与 ChatGPT 网页登录不是同一种凭据。模型的费用、联网、文件操作和工具调用能力取决于你选择的服务或 Agent。此项目的兼容 API 接入只发送文本请求；需要执行本机文件任务时，请绑定具备相应能力的命令行 Agent。

每位小队成员可以使用不同的 Agent。初次设置可点 **让全部成员使用**；之后再单独调整。名称、LOGO、成员专长、角色外观、派工词、快捷任务以及昼夜效果都可在设置里修改。

## 自动分工怎样工作

默认流程是 **分析任务 → 决定分工 → 执行 → 显示结果**。调度请求会交给本次任务选中的 Agent；它返回单人、接力或并行方案，最多安排三名成员。任务卡显示判断理由和每位成员的步骤。若调度结果无法解析，任务会交给原本选中的成员独立处理，并在卡片里说明。

想自己控制时，展开任务框下方的 **派工设置（可选）**，可以指定成员、执行器和协作方式。接力会把上一位的结果交给下一位；并行会同时执行，再由主办成员汇总。一次只运行一个顶层任务。

## 探索办公室

点击角色可看资料并给他派任务。点击场景里的小牌子可以打开黑板计划、会议桌、工作区书架、茶水间和休息角。黑板能记便签；书架能查看工作区文件；会议桌也有手动指定协作的入口。右上角可把场景全屏显示。

## 本地数据与安全

- `data/settings.json`：办公室和 Agent 配置。
- `data/provider-secrets.json`：API Key。页面状态接口不会返回完整密钥。
- `data/tasks.json`、`data/board.json`：任务历史和黑板便签。
- `workspace/`：命令行 Agent 的工作目录。

这些目录在 GitHub 仓库里被忽略。**不要把个人 `data/` 或 `workspace/` 提交到公开仓库。** 自定义命令行 Agent 会以本机用户身份运行你配置的程序，请只配置你信任的命令和接口。运行前请自行确认对应 Agent 的授权、费用和操作范围。

## 已知边界

- AI 的分工判断可能不合适，可用派工设置手动改；不可用的执行器也可能导致任务失败。
- Hermes 需要先在本机独立安装并可运行；本项目不安装或修复 Hermes。若使用自定义 PowerShell 启动脚本，可设置 `PIXEL_OFFICE_HERMES_SCRIPT`，或在高级设置中填入命令。
- API 接口目前使用 Chat Completions 格式。特殊协议可以通过高级 HTTP 接入，但需要按服务商文档配置。

本项目的场景与角色为原创像素绘制，没有使用《星露谷物语》或其他产品的游戏素材。MIT 许可证见 [LICENSE](LICENSE)。

**检索关键词：** AI Agent 可视化、像素办公室、多 Agent 协作、自动分工、俯视像素、agent visualization、pixel art AI workspace、multi agent dashboard、Ollama、Codex、Hermes。
