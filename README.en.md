# Pixel Agent Office

[简体中文](README.md) · [License](LICENSE)

**A working, top-down pixel art office for AI agents.** Describe a task and an agent first decides whether one member can handle it or whether the work should be handed off or done in parallel. Watch members walk to their desks and see the routing reason, handoffs, progress, and final result.

![Clean preview of Pixel Agent Office](docs/screenshot.png)

## Who it is for

People who want a visual interface for local or cloud AI agents without configuring JSON or designing a multi-agent workflow first. On desktop, the main dashboard fits within one viewport; long results scroll inside the task panel. Narrow screens use a vertical layout.

## Get started

Requires **Node.js 20 or newer**. There are no runtime npm dependencies, so `npm install` is not needed.

1. Download and extract the repository, or run `git clone https://github.com/vmayfuture/pixel-agent-office.git`.
2. On Windows, double-click **启动办公室.cmd**. On macOS or Linux, run `node server.mjs` in the project directory. `npm start` works too.
3. Open <http://127.0.0.1:4321> and choose **Customize → Connect Agent**. Pick a service you already have, follow the on-screen steps, and save.
4. Describe any task and click **Send to team**. AI routing is the default.

The server binds only to `127.0.0.1`. Close its terminal to stop it. Set `PIXEL_OFFICE_PORT` to change the default port `4321`.

## Connect an agent

| Option | What you need | Notes |
| --- | --- | --- |
| Local Ollama model | Running Ollama and a downloaded model | The setup screen lists detected models and can select one automatically. |
| Codex | Installed and authenticated Codex CLI | Suitable for tasks that need local files and tools. |
| Hermes Agent | A working Hermes installation | Hermes manages its own internal subagents. |
| DeepSeek, OpenRouter, OpenAI API | The provider's API key and, if needed, a model ID | Select a template under **Cloud API**; the base URL is filled in. Uses `/chat/completions`. |
| Other agents and APIs | Provider documentation or a local command | **Advanced integration** supports compatible APIs, custom HTTP JSON, and command-line agents. |

An API key is separate from a ChatGPT web login. Cost, network access, file operations, and tool use depend on the agent or service you configure. The compatible API integration sends text requests only; bind a capable command-line agent when the work needs local file or tool access.

Each team member can use a different agent. For a quick start, click **Use for all members**, then customize individual members later. You can also change the office name, logo, member expertise, avatars, routing keywords, quick tasks, and day or night scene.

## Automatic task routing

The default workflow is **analyze → assign → execute → show result**. The selected agent proposes solo, sequential handoff, or parallel work, with up to three members. The task card shows its reason and each member's steps. If the routing answer cannot be parsed, the originally selected member handles the task alone and the card explains the fallback.

Open **Dispatch settings (optional)** below the task box to choose a member, executor, or collaboration mode yourself. Sequential work passes the previous member's output to the next; parallel work runs contributions together and has the lead member synthesize the result. One top-level task runs at a time.

## Explore the office

Click a character to inspect them or assign work. Click the small signs in the scene to open the planning board, meeting table, workspace shelf, kitchen, and lounge. The board stores notes, the shelf shows workspace files, and the meeting table offers manual collaboration controls. You can also make the scene full screen.

## Local data and security

- `data/settings.json`: office and agent configuration.
- `data/provider-secrets.json`: API keys; the page state endpoint does not return full keys.
- `data/tasks.json` and `data/board.json`: task history and planning notes.
- `workspace/`: working directory for command-line agents.

These directories are ignored by Git. **Do not commit your personal `data/` or `workspace/` to a public repository.** A custom command-line agent runs as your local user, so configure only commands and endpoints you trust. Check the permissions, costs, and operational scope of each agent you enable.

## Current limits

- AI routing can make a poor choice; use the optional manual controls when needed. An unavailable executor can still cause a task to fail.
- Hermes must be installed and working separately. This project does not install or repair Hermes. For a custom PowerShell startup script, set `PIXEL_OFFICE_HERMES_SCRIPT` or configure the command in advanced settings.
- The API integration uses Chat Completions. Other protocols can be configured through advanced HTTP integration using your provider's documentation.

The scene and characters are original pixel art and do not use assets from Stardew Valley or other products. Licensed under [MIT](LICENSE).

**Search terms:** visual AI agent office, pixel art AI workspace, multi-agent dashboard, automatic task routing, agent visualization, top-down pixel art, Ollama, Codex, Hermes.
