# Pixel Agent Office · 松果办公室

> Put your AI agents in a living, top-down pixel office. Describe a goal; they decide how to divide the work, walk to their desks, and show you what happened.

**Local-first · Automatic task routing · Multi-agent collaboration · Customizable team · Original pixel art**

[简体中文](README.md) · [Quick start](#quick-start) · [Connect agents](#connect-agents) · [Configuration and updates](#configuration-and-updates) · [Troubleshooting](#troubleshooting) · [MIT license](LICENSE)

## What is this?

Pixel Agent Office is an open-source **visual workspace for AI agents**. It turns task submission, executor selection, and progress tracking into a small office with characters, desks, and interactive rooms. You do not have to choose a collaboration mode before every task: by default, a configured agent analyzes the request and selects solo work, sequential handoff, or parallel collaboration.

For example, ask for a to-do web page and a user guide. The team first explains its routing choice. During execution, characters move and sit at their desks while the task card shows which agent is working, the reason for the assignment, each step and handoff, and the final output. You can copy the result or inspect files in the workspace.

![Pixel Agent Office: top-down scene, task composer, team, and progress panel](docs/screenshot.png)

*The screenshot comes from a separate instance with empty task data. Your office changes with your team and settings.*

## Feature tour

| What you can do | How it works |
| --- | --- |
| **Send any task from one box** | Describe your goal and click “Send to team.” Tasks are not limited to predefined categories; the actual capabilities come from the agents you connect. |
| **Let AI route the work** | An agent judges the request and chooses solo, sequential, or parallel execution. The task card shows its reason; obvious one-sentence and short-answer requests are kept with one member. |
| **Watch the work happen** | Members walk to their desks and sit down. The live panel shows progress, activity, individual outputs, handoffs, and the final result. You can stop a running task. |
| **Build your own team** | Configure 1–8 members: names, roles, expertise, routing keywords, personal instructions, animal sprites, colors, and agent bindings. |
| **Connect different agents** | Guided options for Ollama, Codex, Claude Code, Hermes, DeepSeek, OpenRouter, and OpenAI API, plus advanced compatible API, custom HTTP JSON, and local command-line integrations. |
| **Explore the office** | Click characters and room signs. Keep notes on the board, arrange work at the meeting table, browse workspace files on the shelf, change the daylight in the kitchen, or talk to a member in the lounge. |
| **Make it yours** | Change the office name, subtitle, location sign, emoji or image logo, quick tasks, day/night setting, idle movement, and short-task animation timing. The scene can fill the screen. |

### Automatic routing and manual control

The default path is **analyze → assign → execute → show result**. Automatic routing uses up to three members:

- **Solo:** one member handles a single, small deliverable.
- **Sequential handoff:** each member receives the previous member's output.
- **Parallel:** members work on distinct parts at the same time, then the lead synthesizes a final result.

If the routing response cannot be parsed, the originally selected member handles the task alone and the task card explains the fallback. Open **“Dispatch settings (optional)”** to choose the member, executor, or collaboration mode yourself. Only one top-level task runs at a time.

### Things to click in the office

- **Characters:** see a member's name, expertise, connected agent, and recent work; assign them a task.
- **Planning board:** add, finish, or delete notes and inspect recent tasks.
- **Meeting table:** return to task entry with automatic routing or a manual sequential/parallel choice.
- **Workspace shelf:** refresh the file list and preview small text files.
- **Kitchen:** follow local time or set permanent day or night.
- **Lounge:** send a real task directly to a selected member and see the reply in the task card.

The dashboard fits common desktop window sizes with long results scrolling inside the task panel. Narrow screens use a vertical layout.

## Quick start

### 1. Prerequisites

| Requirement | Details |
| --- | --- |
| Node.js | **20 or newer**, available from [nodejs.org](https://nodejs.org/). |
| Git | Required for cloning; optional when downloading the ZIP. |
| Agent / model service | Configure at least one integration below to run real tasks. |

Check Node.js in your terminal:

```sh
node --version
```

The version must be `v20` or higher. The project has no runtime npm dependencies and can run directly after download.

### 2. Download the project

Open a terminal in the folder where you want to keep the project:

```sh
git clone https://github.com/vmayfuture/pixel-agent-office.git
cd pixel-agent-office
```

Alternatively, [download the ZIP](https://github.com/vmayfuture/pixel-agent-office/archive/refs/heads/main.zip) and extract it. Open a terminal in the extracted project folder; it should contain `server.mjs` and `package.json`.

### 3. Start the office

Run **one** of the following options from the **project folder**.

**Windows · PowerShell**

```powershell
.\启动办公室.cmd
```

You can also double-click [启动办公室.cmd](启动办公室.cmd) in the project folder. The launcher opens your browser automatically.

**macOS / Linux · Terminal**

```bash
node server.mjs
```

**Alternative for any platform · requires npm**

```sh
npm start
```

On success, the terminal displays a message similar to:

```text
像素办公室已启动：http://127.0.0.1:4321
Agent 工作区：…/pixel-agent-office/workspace
```

Open **[http://127.0.0.1:4321](http://127.0.0.1:4321)** in your browser. Keep the server terminal running.

### 4. Connect an agent and submit a task

The current interface uses Simplified Chinese. Original button labels are included below.

1. Open **Customize (自定义) → Connect agents (接入 Agent)** at the top right.
2. Choose an installed or configured agent / model service using the [integration guide](#connect-agents) below.
3. Enable it and choose **Use for all members (让全部成员使用)** or assign members individually. Click **Save settings (保存设置)**.
4. Return to the dashboard, enter a task, and click **Send to team (交给小队)**. AI routing is the default.

> One integration is enough to get started. Opening the page confirms that the office server is running; tasks also require a working agent configuration.

## Connect agents

Choose the section for the service you want to use. The installation commands below install the individual agents; the office calls them through local commands or APIs.

| Integration guide | What you need | What it provides |
| --- | --- | --- |
| **[Local Ollama model](#local-ollama-model)** | Running Ollama and a downloaded model | Lists local models and can select one automatically. |
| **[Codex](#codex)** | Installed and authenticated Codex CLI | Uses Codex tools and local file capabilities. |
| **[Claude Code](#claude-code)** | Installed and authenticated Claude Code CLI | Uses the file editing and tools Claude Code permits. |
| **[Hermes Agent](#hermes-agent)** | A working Hermes installation | Uses Hermes models, tools, and internal subagents. |
| **[Cloud APIs](#cloud-apis)** | A provider API key and model ID | DeepSeek, OpenRouter, OpenAI API, and compatible services. |
| **[Other agents and APIs](#other-agents-and-apis)** | A local command or provider documentation | Custom CLI, HTTP JSON, or compatible API. |

After installing a CLI agent, open a new terminal and restart the office so it reads the updated PATH. Each member can use a different agent.

### Local Ollama model

**Install and start the service**

Follow the [official Ollama guide](https://docs.ollama.com/quickstart). On Windows / macOS, open the installed Ollama app. On Linux, if the service is not already running, execute this in a terminal and keep it open:

```sh
ollama serve
```

**Download a model and check it**

Run these commands in another terminal. This example uses [Qwen3 4B](https://ollama.com/library/qwen3:4b); you can use another downloaded model:

```sh
ollama --version
ollama pull qwen3:4b
ollama list
```

**Connect in the office**

Choose **Customize → Connect agents → Local model (本地模型)**. Pick a listed model or automatic selection, enable it, assign members, and save. The default address is `http://127.0.0.1:11434`; no API key is needed.

### Codex

**Install · Windows PowerShell**

```powershell
irm https://chatgpt.com/codex/install.ps1 | iex
```

**Install · macOS / Linux**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

These installers are documented in the [official OpenAI Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli). If the CLI is already installed, continue with sign-in.

**Sign in**

Open a new terminal and follow the sign-in prompts:

```sh
codex login
```

**Check installation and authentication**

```sh
codex --version
codex login status
```

**Connect in the office**

Choose **Customize → Connect agents → Codex**, enable it, assign members, and save. The office uses the local CLI login and configuration to run tasks in `workspace/`.

### Claude Code

**Install · Windows PowerShell**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Install · macOS / Linux**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

See the [official Claude Code setup guide](https://code.claude.com/docs/en/setup) for other installation methods. If the CLI is already installed, continue with sign-in.

**Sign in**

In a new terminal, run:

```sh
claude auth login
```

**Check installation and authentication**

```sh
claude --version
claude auth status
```

**Connect in the office**

Choose **Customize → Connect agents → Claude Code**, enable it, assign members, and save. It uses the local login, with no API key entered in the office. Tasks run in `workspace/`; the preset permits file edits, while other tools follow Claude Code's permissions.

The office coordinates solo, relay, and parallel work. Claude Code can use its configured internal subagents, but their steps are not shown as separate office characters. Connection status checks installation and login; task completion also depends on the account and tool permissions.

### Hermes Agent

**Install · Windows PowerShell**

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

**Install · macOS / Linux**

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

See the [official Hermes installation guide](https://hermes-agent.nousresearch.com/docs/getting-started/installation) for platform requirements and other methods. If you already have a working installation, continue with setup.

**Configure models and tools**

Open a new terminal, run the wizard, and configure your model service:

```sh
hermes setup
```

**Check that Hermes can complete a task**

```sh
hermes -z "Introduce yourself in one sentence"
```

**Connect in the office**

Choose **Customize → Connect agents → Hermes**, enable it, assign members, and save. Hermes manages its own internal subagents. Configure custom launch scripts in Advanced integrations. If using WSL, run both the office and Hermes inside the same WSL environment.

### Cloud APIs

Configure cloud APIs in the interface:

1. Open **Customize → Connect agents → Cloud API (云端 API)**.
2. Choose a provider template.
3. Enter the provider API key and confirm the model ID. For a custom compatible service, also enter its base URL.
4. Enable the integration, assign members, and save.

| Provider | Prefilled base URL | Model ID |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | You can change the prefilled model. |
| OpenRouter | `https://openrouter.ai/api/v1` | Copy from the provider model list. |
| OpenAI API | `https://api.openai.com/v1` | You can change the prefilled model. |
| Other compatible service | Enter the URL | Follow the provider documentation. |

An API key is separate from a ChatGPT web login. This integration sends Chat Completions text requests. For local files or tools, bind a CLI agent that supports those capabilities.

### Other agents and APIs

Open **Customize → Advanced integrations (高级接入设置)** and choose a local command agent, custom HTTP JSON, or compatible API. Use the agent / provider documentation to fill in its launch command or endpoint.

Local command arguments use one line per argument. Use `{{prompt}}` for task content and `{{workspace}}` for the workspace path. Commands start in this project's `workspace/` folder.

## Configuration and updates

### Change the port

The default server listens only on `127.0.0.1:4321`. To use `4322`, stop the current office and run the following in the project folder:

**Windows · PowerShell**

```powershell
$env:PIXEL_OFFICE_PORT = "4322"
node server.mjs
```

**macOS / Linux · Terminal**

```bash
PIXEL_OFFICE_PORT=4322 node server.mjs
```

Then open **[http://127.0.0.1:4322](http://127.0.0.1:4322)**.

### Stop and update

Stop the server with **Ctrl+C** in its terminal, or close that terminal.

For a Git clone, stop the server and run this in the project folder:

```sh
git pull --ff-only
```

Then follow the [startup instructions](#3-start-the-office) again. For a ZIP installation, download the new version and keep your `data/` and `workspace/` folders.

## Customization and local data

Settings let you change:

- **Brand and scene:** name, subtitle, location sign, logo, daylight, idle movement, and animation timing.
- **Team:** size, order, names, expertise, routing keywords, personal instructions, appearance, and agent bindings.
- **Quick tasks:** button title, prompt, member, and executor.
- **Advanced integrations:** multiple executors, URLs, request formats, CLI arguments, and persistent instructions.

Configuration lives in `data/settings.json`. API keys are stored separately in `data/provider-secrets.json` and are not returned in full by the page state endpoint. Task history and planning notes live in `data/tasks.json` and `data/board.json`. Command-line agents work in `workspace/`. Git ignores these directories: **do not commit personal data or keys to a public repository**.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Node.js is not found | Install Node.js 20 or newer, then open a new terminal. |
| The page opens but tasks fail | Check that the agent works in your terminal and is enabled, assigned to members, and saved. |
| An installed agent still shows disconnected | Check the command in a new terminal, then restart the office. For a custom install, set its full executable path in Advanced integrations. |
| Ollama has no selectable models | Start the service, download a model, and check the model list. |
| Claude Code shows unauthenticated | Follow the [Claude Code sign-in steps](#claude-code) and check its status. |
| The port is occupied | [Change the port](#change-the-port) and open the URL for the new port. |

## Current limits

- AI can make a poor routing choice; use manual dispatch when you need a fixed workflow.
- Claude Code and Hermes must be installed and working independently. This project does not install or repair them. For a custom Hermes startup script, use advanced settings or `PIXEL_OFFICE_HERMES_SCRIPT`.
- Compatible API integration currently uses Chat Completions. Other protocols require custom advanced HTTP setup following your provider's documentation.
- Custom command-line agents run as your local user. Configure only commands you trust and check the permissions and costs of each service.

The scene and characters are original pixel art and do not use assets from Stardew Valley or other products. Licensed under [MIT](LICENSE).

**Related search terms:** visual AI agent office, pixel art AI workspace, multi-agent dashboard, automatic task routing, top-down pixel art, Ollama, Codex, Claude Code, Hermes.
