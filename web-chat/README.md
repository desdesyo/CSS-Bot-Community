# SOLO.Chat

SOLO.Chat is a private browser chat backed by a Cloudflare Worker and a durable AI agent. The browser uses one HTTPS page; authentication, model access, GitHub tools, and conversation storage stay server-side.

## Architecture

- Browser UI: `public/index.html`
- API, password authentication, and chat protocol: `agent-runtime/src/index.ts`
- Agent runtime: Cloudflare Durable Object `AgentSession` with Pi Durable.
- Conversation history: Durable Object SQLite storage. Each browser conversation and its user/assistant messages are persisted separately; each agent session also retains its durable model transcript.
- Model: Cloudflare Workers AI, selected by `PI_MODEL` in `wrangler.toml` (currently `@cf/zai-org/glm-4.7-flash`).
- Agent workspace: GitHub Contents API tools for listing, reading, and writing files in the configured repository and branch.
- Local computer pairing: authenticated companion requests are queued through the same Durable Object; inspection is automatic, while text/config writes require exact-hash checks, verified backups and a local APPLY confirmation.

Chat history is not written to the public source repository or public GitHub Issues. Cloudflare serves the site and keeps credentials server-side. The browser uses a remembered-device session cookie after successful login; the password is not stored in browser storage.

## Region-independent access requirement

The browser client must work as a normal HTTPS website without requiring the user to install or enable a VPN, proxy, or location-spoofing tool. The application must not request browser geolocation, inspect the user's country to choose a model, or change chat behavior based on the user's IP/location. User location is not part of the chat protocol or conversation identity.

The intended deployment is a globally reachable HTTPS endpoint on Cloudflare Workers (preferably on a stable custom domain), with all model-provider credentials and routing kept server-side. Provider selection and failover happen on the server and must not require any action from the user. Do not add client-side provider URLs, region selectors, VPN instructions, or geo-based UI branches.

**Honest availability boundary:** no application can guarantee access from literally every network or country. A government/network may block the domain or Cloudflare, GitHub may be unreachable, or a model provider may restrict API access from the server's egress region. These are upstream/network restrictions, not a reason to ask the user to use a VPN. For resilience, deploy the app on a stable domain and configure at least one independent, legally available server-side model provider endpoint; test the complete path from the intended hosting environment. Never claim worldwide availability until tested from multiple networks.

## Required Worker secrets and variables

- `APP_PASSWORD` — private chat access password. Deployment synchronizes this from the GitHub Actions secret `CSSBC_CHAT_APP_PASSWORD`.
- `GITHUB_TOKEN` — fine-grained GitHub token for the configured workspace repository (Contents read/write).
- `BRAVE_SEARCH_API_KEY` — optional; enables the agent's live web-search tool.
- `OPENAI_API_KEY` — optional; used only by the separate external-expert consultation tool.- `CSSBC_OPENAI_API_KEY` — optional GitHub Actions repository secret. The deploy workflow syncs it to Worker secret `OPENAI_API_KEY`; required for automatic expert escalation.

To enable SOLO.Chat's automatic expert escalation, add `CSSBC_OPENAI_API_KEY` under the repository's **Settings → Secrets and variables → Actions**. Do not paste the key into chat or commit it. Without this secret, the agent must report that external expert help is unavailable instead of pretending to consult it.


Worker variables in `wrangler.toml`:

- `GITHUB_WORK_REPO` — `desdesyo/modhaul`, the repository the agent's GitHub tools can access.
- `GITHUB_WORK_BRANCH` — `main`, the branch used by those tools.
- `GITHUB_WORK_ROOT` — optional path restriction.
- `PI_MODEL` — Workers AI model identifier.

Text chat and durable conversation history use Durable Object storage. User attachments are stored as bounded chunks in the authenticated Durable Object; they are not committed to the public source repository.

## Automated agent orchestration

`.github/workflows/agent-orchestrator.yml` is the LLM dispatcher: it forwards newly opened `agent-task` issues, queued tasks, manual prompts, and failed `GitHub Chat checks` / `CSSBC Core CI` runs into the deployed Durable Agent at `/api/agent/chat` (JSON `prompt`, not legacy `/api/chat` `message`). The durable agent uses its GitHub tools to inspect, implement, commit, and verify work. `agent-supervisor.yml` independently audits task issue structure/evidence and labels review-needed; it is a policy/evidence audit, not a second code executor. CI is the tester and its failure is routed back to the agent for repair.

The orchestrator uses the deployed Worker URL `https://cssbc-github-chat.descapan.workers.dev/` and the repository secret `CSSBC_CHAT_APP_PASSWORD`. Deployment copies that password into the Worker as `APP_PASSWORD`; the value is never printed. The live end-to-end workflow checks the authenticated agent route, GitHub workspace access, browser chat, AI replies, and durable history.

## ChatGPT native image-generator bridge (MCP)

SOLO.Chat exposes a narrowly scoped remote MCP Streamable HTTP endpoint at `/mcp`. It publishes one tool, `solo_generate_image`, which calls the same server-side FLUX.2 Pro → FLUX.1 Schnell implementation and private artifact store as SOLO.Chat's own agent. The endpoint does not expose GitHub, file-write, shell, or general agent tools.

- Endpoint: `https://cssbc-github-chat.descapan.workers.dev/mcp`
- Transport: MCP Streamable HTTP, JSON-RPC 2.0, protocol version `2025-03-26`
- Authentication: `Authorization: Bearer <APP_PASSWORD>` (the existing SOLO.Chat application password; never put it in a URL or prompt)
- Tool: `solo_generate_image(prompt, filename?)`
- Output: provider, quality/fallback details, and an absolute private artifact URL under `/api/files/<id>`

The endpoint requires the same application password as the browser chat and authenticates every request. Keep the MCP connection private; do not publish its bearer credential. Image generation may incur Cloudflare AI usage charges/quotas. The endpoint returns the actual provider error if both FLUX models fail.

**ChatGPT default-use boundary:** exposing an MCP endpoint does not silently add it to a user's ChatGPT tools. A one-time custom-connector/app connection in ChatGPT is still required; after that connection is active, the connector's tool instructions explicitly designate SOLO.Chat as the default image generator. This repository cannot change ChatGPT account settings or activate a connector on the user's behalf.

## ChatGPT handoff queue

When SOLO.Chat is blocked or needs an independent review, it can call `handoff_to_chatgpt`. The tool writes a sanitized Markdown evidence bundle to `agent-handoffs/pending/` on `github-chat-prototype`, using the existing GitHub Contents write permission. The handoff contains the goal, inspected evidence, attempts, errors and constraints; credentials and secrets are redacted.

This is a durable handoff queue that the user's ChatGPT assistant can retrieve through the connected GitHub repository when asked to inspect pending handoffs. It does **not** send a push notification or invoke the user's live ChatGPT conversation; there is no public API for targeting a particular active ChatGPT session. The agent must not claim otherwise.

## Expert escalation and persistent learning

The durable agent has three explicit tools:

- `consult_external_expert` sends a bounded problem statement, attempts/evidence, and constraints to a separately configured OpenAI API model (default `gpt-4.1`). It returns a proposed diagnosis and verification plan; it does not execute the fix.
- `save_learned_skill` writes a reusable Markdown procedure to `agent-skills/candidates/` on the configured GitHub branch.
- `load_learned_skill` retrieves a previously saved procedure for future tasks.

The agent instructions require it to inspect relevant skills before non-trivial work, consult the expert after meaningful blockage, independently implement and verify advice, and save evidence-backed procedures after novel successful tasks. Skills are durable procedural memory, not model-weight training.

**Important boundary:** the expert call is a separate OpenAI API inference. It cannot invoke or continue a particular user's live ChatGPT conversation or subscription session. It requires the Worker secret `OPENAI_API_KEY`; optional `EXPERT_MODEL` selects another API model. Never expose this key in the browser or repository.

## Durable agent runtime and local computer bridge

The chat now routes text-only compatible turns through a Cloudflare Durable Object running Pi Durable. The legacy Responses API path remains the fallback for PDF/image turns until multimodal support is added to the durable harness.

- Pi Durable stores per-conversation sessions in Durable Object SQLite and resumes interrupted work after object eviction/restart.
- Each agent has a persistent Cloudflare Computer workspace backed by the same Durable Object SQLite. It provides read/write/search tools and an isolated JavaScript execution backend with network egress disabled. This is the cloud sandbox, not the user's Windows PC.
- The agent can read/write UTF-8 files in the configured GitHub workspace, create downloadable text artifacts in private chat storage, generate high-quality JPEG images with FLUX.2 Pro and a FLUX.1 fallback, generate songs with MiniMax Music 2.6, synthesize Russian speech with xAI Grok TTS, and generate textured GLB models with Meshy 7.1 when its API secret is configured. The media providers must be available through Cloudflare AI Gateway Unified Billing; Meshy additionally requires CSSBC_MESHY_API_KEY. These integrations are source-implemented but must pass live provider tests before being called production-ready. It can also search the web, run heuristic static source checks, and connect allowlisted MCP servers.
- MCP servers are persisted by MCPClientManager. Only tools marked `readOnlyHint=true` are callable autonomously. Other MCP tools are blocked pending a human approval UI.
- The browser's **Подключить компьютер** button creates a one-time pairing code. The local Node.js companion in `../computer-bridge` polls outbound over HTTPS and supports system info, directory listing, and reading selected text/config files under explicitly configured roots. It also supports a narrowly scoped `write_text_file` action for allowlisted source/config extensions and `install_smx` for one verified plugin under `cstrike/addons/sourcemod/plugins/`. Both require exact SHA-256 checks, verified backups, local APPLY approval, atomic replacement and post-write hash verification. A hash-only inspection action can obtain binary SHA-256 without uploading contents. It does not execute shell commands, launch processes, write DLL/EXE/core engine binaries, or delete files.
- The source scanner is heuristic, not a full SAST product and not proof that code is safe. JavaScript tests and analysis can also run in the isolated Cloudflare Computer Dynamic Worker, which has no outbound network access. Do not run untrusted project scripts with network or secret access.

Additional Worker bindings and variables:
- `AI` — Workers AI binding used by the durable Pi harness.
- `LOADER` — Worker Loader binding used by the isolated JavaScript workspace backend.
- `AGENT_SESSIONS` — SQLite Durable Object binding (declared in wrangler.toml).
- `PI_MODEL` — optional Workers AI model ID; defaults to `@cf/zai-org/glm-5.3-flash`.
- `MCP_ALLOWED_HOSTS` — comma-separated exact hostnames allowed for outbound MCP connections. Leave empty until you intentionally approve servers.
- `BRAVE_SEARCH_API_KEY` — also used by the durable agent's web-search tool.

The local bridge requires Node.js 20+ on the computer and a deployed HTTPS chat URL. Pairing code expires in five minutes and is single-use. The device token is stored only in local `computer-bridge/config.json`; that file is ignored by Git. To use local editing, add each existing source/game directory to `allowedRoots` in the local config; do not grant the entire drive.

## Deploy

First create a separate **private** GitHub repository for conversation history. Create a fine-grained token limited to that private repository, with Issues read/write permission. The chat Worker stores message text in GitHub Issue comments, so anyone with access to that private repository can read it.

Set the `GITHUB_REPO` Worker variable to that private repository before deploying.

Requires Node.js and Wrangler:

```sh
cd web-chat
npm install
npx wrangler login
npx wrangler secret put APP_PASSWORD
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler deploy
```

Cloudflare serves `public/index.html` and routes `/api/*` to the Worker. Keep all secrets out of GitHub files and browser code.

## Current scope / limitations

- File workspace: authenticated upload, list, download and delete, plus server-side artifact storage in private Durable Object storage using 64 KiB chunks. Upload limit is 15 MB per file.
- File analysis supports text, Markdown, CSV, JSON, XML, logs, source-code text, PDFs and images through the legacy multimodal path. CSV analysis is deterministic. The durable Cloudflare Computer workspace also supports persistent files and isolated JavaScript execution with network egress disabled; DOCX/XLSX/OCR and audio/video pipelines remain unimplemented.
- Durable agent tools: GitHub repository list/read/write, persistent workspace read/write/search, isolated JavaScript execution, heuristic static source analysis, Brave web search, MCP discovery and read-only tool calls, and read-only local computer inspection when paired. GitHub writes create auditable commits on `github-chat-prototype`. The legacy Responses API path remains for PDF/image turns.
- Live web search uses Brave Search and requires `BRAVE_SEARCH_API_KEY`. Search results are passed to the model for synthesis; users should receive source URLs in the answer.
- The interface includes file attachment, a web-search toggle, and a save-answer-as-Markdown action.
- Each conversation is a GitHub Issue; turns are comments. Conversation and comment retrieval is paginated (up to 10,000 issues and 5,000 comments per issue in one retrieval), and continuation ancestry is followed for up to 100 linked segments. The just-submitted user turn is explicitly re-injected when rollover creates a fresh continuation, preventing a boundary-turn loss.
- One visible conversation is a chain of GitHub Issues. When the context grows beyond the rollover threshold, the Worker creates a continuation automatically and writes a durable summary of goals, decisions, constraints, project facts, and unfinished tasks. The browser keeps the same root conversation ID and does not show a new chat.
- The Worker retries transient GitHub/model errors and can use an optional OpenAI-compatible backup provider when configured (`FALLBACK_API_URL`, `FALLBACK_API_KEY`, `FALLBACK_MODEL`). The browser silently retries failed requests and preserves the unsent draft instead of displaying infrastructure errors.
- This is best-effort continuity, not guaranteed infinite uptime: if all providers, credentials, or usage quotas are unavailable, no model can produce a reply. The interface avoids exposing internal provider/tool messages; it cannot manufacture an answer while all backends are offline.
- Chat history is only as private as the dedicated repository. The Worker refuses to operate unless `GITHUB_REPO` is explicitly configured; never use the public source repository for conversation storage.
- API usage is billed by the model provider. GitHub/Cloudflare storage does not make model inference unlimited.
- The local PC bridge is implemented as an opt-in companion, but it is not connected until the Worker is deployed, a pairing code is generated, and the companion is started on Windows. Its source-text writer and single-file .smx installer are implemented in source but remain unverified on the user's actual PC until pairing and a test operation are completed.
- Add individual user identity, per-user file ownership, explicit MCP write approvals, device revocation, streaming UI, DOCX/XLSX ingestion, OCR, broader sandbox language runtimes, device task cancellation, and automated end-to-end tests before broad/public use.

## Security notes

Never put API tokens in HTML, JavaScript, committed configuration, or chat messages. Use Worker secrets. The public API is password-protected and does not expose arbitrary shell execution. The opt-in local companion only accesses configured roots. Text/config edits are approval-gated, SHA-checked and backed up locally; it has no shell or arbitrary process execution. A single-file .smx installer exists, but multi-file packages and native DLL installation remain unsupported. Uploaded and retrieved content is untrusted data, not executable instructions.


## Deployment automation

Cloudflare deployment is triggered by pushes to `github-chat-prototype` that modify `web-chat/**`; see `.github/workflows/deploy-github-chat.yml`.


## Autonomous failure repair (GitHub Chat)

Workflow `.github/workflows/agent-orchestrator.yml` runs a bounded three-role team for queued issues and failed CI/deploy runs: planner (no writes), implementer (audited project writes), and independent read-only tester. A rejected review allows one repair/re-test cycle. The separate `.github/workflows/agent-supervisor.yml` checks the exact current commit's CI and, whenever `web-chat/**` changed, a successful deployment of that same SHA before marking a task done. Health/model monitors create repair issues when live checks fail. The dashboard reads real workflow job-step states. This is implemented in source; live production behavior is not verified until Actions and authenticated model smoke tests succeed.

**Required GitHub Actions repository secrets** (Settings → Secrets and variables → Actions):
- `CSSBC_CHAT_ENDPOINT`: deployed HTTPS Worker origin only, e.g. `https://your-worker.your-subdomain.workers.dev` (no `/api/chat` suffix).
- `CSSBC_CHAT_APP_PASSWORD`: exact same value as Cloudflare Worker secret `APP_PASSWORD`.

The Worker must also have `GITHUB_TOKEN` (synced from repository secret `CSSBC_GITHUB_TOKEN`) with Contents read/write on the allowlisted project repositories. The default workspace remains `desdesyo/modhaul/main`; dedicated `github_project_*` tools explicitly route SOLO.Chat self-maintenance to `desdesyo/CSS-Bot-Community/github-chat-prototype` and SDK work to `sdk-foundation`. The browser never receives the token.

The workflow is an **external autonomous repair loop**, not a push into the currently open ChatGPT web conversation. Its result is recorded in the Actions run and in the agent's GitHub conversation history. The currently open ChatGPT session cannot receive unsolicited messages from GitHub; to make that happen requires a separate supported inbox/notification integration. Repair is only activated after those secrets are configured and the Worker is deployed.


## Canonical SOLO.Chat link

- The canonical user-facing application URL is `https://cssbc-github-chat.descapan.workers.dev/`.
- Whenever any agent shares, mentions, documents, or returns a link to the deployed chat, display the clickable link text exactly as **[SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/)**. Do not expose the raw URL as the visible link label unless the user explicitly asks for it.
- Treat this as a global product convention for every agent, workflow report, generated instruction, README, and handoff. Do not invent alternate chat URLs or rename the product.


## Free ChatGPT Web bridge (Windows desktop)

The remote MCP endpoint is Streamable HTTP, while the community Web MCP Bridge starts local tools over stdio. This repository includes a small Node.js 20+ adapter at `mcp-bridge/solo-mcp-stdio.mjs` that forwards only the existing `solo_generate_image` tool to the remote endpoint.

1. Install the open-source [Web MCP Bridge](https://github.com/AstraxOf/web-mcp-bridge) in desktop Chrome, Edge or Brave. Its Python bridge is required by that extension; this adapter itself uses Node.js only.
2. Copy `mcp-bridge/solo-mcp-bridge.local.example.json` to `mcp-bridge/solo-mcp-bridge.local.json` and enter the existing SOLO.Chat app password in that local file. Never commit or send that password.
3. Add one server to Web MCP Bridge's `server/servers.json` (replace the path with the actual absolute path):
   ```json
   { "name": "solo-chat", "port": 8082, "command": ["node", "C:/PATH/TO/web-chat/mcp-bridge/solo-mcp-stdio.mjs"] }
   ```
4. Keep the permission at **Ask every time**. In ChatGPT Web, inject the bridge instructions and ask it to generate an image using `solo-chat`.

The bridge is a community extension, not an OpenAI feature. It requires a desktop browser and the extension running locally; it does not work in the ChatGPT Android app. The adapter only exposes the SOLO.Chat image tool and forwards its result. It does not expose GitHub, shell, filesystem or other SOLO.Chat tools.


### Image provider routing and quota recovery

Image generation defaults to Cloudflare Workers AI FLUX.1 Schnell only. The runtime records provider failures in Durable Object storage and opens a circuit after quota/rate-limit failures; Cloudflare quota failures remain bypassed until shortly after the next UTC daily reset. Temporary provider errors use a short cooldown. Generated payloads are still checked against JPEG/PNG/WebP signatures before being stored.

A paid image fallback is deliberately **off by default**. To opt in, configure the repository Actions secret `CSSBC_IMAGE_PROVIDER_ORDER` as `cloudflare,openai` (and ensure `CSSBC_OPENAI_API_KEY` is configured). This enables the OpenAI Images API as a second provider only after Cloudflare fails or is circuit-open. OpenAI image requests may incur charges; the runtime never enables this fallback merely because an OpenAI text key exists. Set the secret to `cloudflare` or leave it unset to remain free-tier-only. The optional Worker secret `IMAGE_OPENAI_MODEL` can override the default image model.
