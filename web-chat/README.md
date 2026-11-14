# GitHub Chat

A small browser chat UI with conversation history stored in GitHub Issues and AI replies generated through the OpenAI Responses API. It is designed as a separate workspace alongside CSS Bot Community.

## Architecture

See [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md) for the target universal-agent architecture, security boundaries, and staged implementation plan.

- Browser UI: `public/index.html`
- API and authentication: Cloudflare Worker in `worker.js`
- Conversation persistence: GitHub Issues with the `github-chat` label; each user/assistant turn is a comment.
- Model: OpenAI Responses API. Default is `gpt-4.1-mini`; override with `OPENAI_MODEL`.
- Agent workspace: optional GitHub Contents API integration for listing, reading, creating, and updating real repository files with auditable commits. It is restricted to a configured workspace root.

The public CSS Bot Community repository stores the application source only. Conversation records must go to a separate **private** GitHub repository. Cloudflare Workers serves the site and keeps API credentials server-side. A static GitHub Pages-only site is deliberately not used for API calls because it would expose secrets in browser code.

## Region-independent access requirement

The browser client must work as a normal HTTPS website without requiring the user to install or enable a VPN, proxy, or location-spoofing tool. The application must not request browser geolocation, inspect the user's country to choose a model, or change chat behavior based on the user's IP/location. User location is not part of the chat protocol or conversation identity.

The intended deployment is a globally reachable HTTPS endpoint on Cloudflare Workers (preferably on a stable custom domain), with all model-provider credentials and routing kept server-side. Provider selection and failover happen on the server and must not require any action from the user. Do not add client-side provider URLs, region selectors, VPN instructions, or geo-based UI branches.

**Honest availability boundary:** no application can guarantee access from literally every network or country. A government/network may block the domain or Cloudflare, GitHub may be unreachable, or a model provider may restrict API access from the server's egress region. These are upstream/network restrictions, not a reason to ask the user to use a VPN. For resilience, deploy the app on a stable domain and configure at least one independent, legally available server-side model provider endpoint; test the complete path from the intended hosting environment. Never claim worldwide availability until tested from multiple networks.

## Required Worker secrets

Set these with `wrangler secret put NAME`:

- `APP_PASSWORD` — a long, unique password for access to this private chat.
- `GITHUB_TOKEN` — fine-grained GitHub token with Issues read/write permission on the private chat-history repository and Contents read/write permission on the configured workspace repository.
- `OPENAI_API_KEY` — API key for model responses and Responses API tool calling.
- `BRAVE_SEARCH_API_KEY` — Brave Search API key for live web research. Without it, web search tools are unavailable.

Create the private R2 bucket before deployment:

```sh
wrangler r2 bucket create cssbc-chat-files
```

The `FILES` R2 binding stores private uploads and generated artifacts. Do not make this bucket public.

Set Worker variables:

- `GITHUB_REPO` — required; set to a separate private repository such as `your-account/private-chat-history`. Do not point this at the public CSS Bot Community repository.
- `GITHUB_WORK_REPO` — optional `owner/repo` where the agent may manage project files. Grant the Worker token Contents read/write access to this repository.
- `GITHUB_WORK_BRANCH` — optional existing branch for agent changes; omit to use the repository default branch.
- `GITHUB_WORK_ROOT` — optional allowed directory prefix; defaults to `agent-workspace`. Leave this unset to allow the configured repository branch; set it to a subdirectory to narrow access.
- `OPENAI_MODEL` — defaults to `gpt-4.1-mini`.
- `ALLOWED_ORIGIN` — optional exact origin for CORS; leave unset for same-origin deployment. This is a browser security setting, not a geographic restriction.

## Durable agent runtime and local computer bridge

The chat now routes text-only compatible turns through a Cloudflare Durable Object running Pi Durable. The legacy Responses API path remains the fallback for PDF/image turns until multimodal support is added to the durable harness.

- Pi Durable stores per-conversation sessions in Durable Object SQLite and resumes interrupted work after object eviction/restart.
- The agent can read/write UTF-8 files in the configured GitHub workspace, search the web, run heuristic static source checks, and connect allowlisted MCP servers.
- MCP servers are persisted by MCPClientManager. Only tools marked `readOnlyHint=true` are callable autonomously. Other MCP tools are blocked pending a human approval UI.
- The browser's **Connect computer** button creates a one-time pairing code. The local Node.js companion in `../computer-bridge` polls outbound over HTTPS and supports only system info, directory listing, and reading selected text/config files under explicitly configured roots. It has no shell, process launch, screenshot, or write/delete capability.
- The source scanner is heuristic, not a full SAST product and not proof that code is safe.

Additional Worker bindings and variables:
- `AI` — Workers AI binding used by the durable Pi harness.
- `AGENT_SESSIONS` — SQLite Durable Object binding (declared in wrangler.toml).
- `PI_MODEL` — optional Workers AI model ID; defaults to `@cf/zai-org/glm-5.3-flash`.
- `MCP_ALLOWED_HOSTS` — comma-separated exact hostnames allowed for outbound MCP connections. Leave empty until you intentionally approve servers.
- `BRAVE_SEARCH_API_KEY` — also used by the durable agent's web-search tool.

The local bridge requires Node.js 20+ on the computer and a deployed HTTPS chat URL. Pairing code expires in five minutes and is single-use. The device token is stored only in local `computer-bridge/config.json`; that file is ignored by Git.

## Deploy

First create a separate **private** GitHub repository for conversation history. Create a fine-grained token limited to that private repository, with Issues read/write permission. The chat Worker stores message text in GitHub Issue comments, so anyone with access to that private repository can read it.

Set the `GITHUB_REPO` Worker variable to that private repository before deploying.

Requires Node.js and Wrangler:

```sh
cd web-chat
npm install
npx wrangler login
wrangler secret put APP_PASSWORD
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
wrangler secret put OPENAI_API_KEY
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx npx wrangler deploy
```

Cloudflare serves `public/index.html` and routes `/api/*` to the Worker. Keep all secrets out of GitHub files and browser code.

## Current scope / limitations

- File workspace: authenticated upload, list, download, delete, and server-side artifact creation through private R2 storage. Upload limit is 15 MB per file. File-library listing follows R2 cursors (up to 10,000 objects per request).
- File analysis currently supports text, Markdown, CSV, JSON, XML, logs, common source-code text files, PDF documents, and image attachments (PDF/image handling is delegated to the configured primary Responses API model). CSV analysis returns deterministic row/column counts and numeric summary statistics. DOCX, XLSX, OCR pipelines, audio/video, and arbitrary code execution are not implemented yet. Binary attachments are not processed by the text-only backup provider.
- Agent tools: the primary Responses API model can call live web search, create downloadable files, read supported uploaded text files, analyze uploaded CSVs, and (when configured) list/read/create/update text files in a GitHub workspace repository. GitHub writes create auditable commits and are path-restricted to `GITHUB_WORK_ROOT`. The tool loop currently permits up to 12 rounds per request. The backup-compatible provider path is text-only and must not claim that tool actions ran.
- Live web search uses Brave Search and requires `BRAVE_SEARCH_API_KEY`. Search results are passed to the model for synthesis; users should receive source URLs in the answer.
- The interface includes file attachment, a web-search toggle, and a save-answer-as-Markdown action.
- Each conversation is a GitHub Issue; turns are comments. Conversation and comment retrieval is paginated (up to 10,000 issues and 5,000 comments per issue in one retrieval), and continuation ancestry is followed for up to 100 linked segments. The just-submitted user turn is explicitly re-injected when rollover creates a fresh continuation, preventing a boundary-turn loss.
- One visible conversation is a chain of GitHub Issues. When the context grows beyond the rollover threshold, the Worker creates a continuation automatically and writes a durable summary of goals, decisions, constraints, project facts, and unfinished tasks. The browser keeps the same root conversation ID and does not show a new chat.
- The Worker retries transient GitHub/model errors and can use an optional OpenAI-compatible backup provider when configured (`FALLBACK_API_URL`, `FALLBACK_API_KEY`, `FALLBACK_MODEL`). The browser silently retries failed requests and preserves the unsent draft instead of displaying infrastructure errors.
- This is best-effort continuity, not guaranteed infinite uptime: if all providers, credentials, or usage quotas are unavailable, no model can produce a reply. The interface avoids exposing internal provider/tool messages; it cannot manufacture an answer while all backends are offline.
- Chat history is only as private as the dedicated repository. The Worker refuses to operate unless `GITHUB_REPO` is explicitly configured; never use the public source repository for conversation storage.
- API usage is billed by the model provider. GitHub/Cloudflare storage does not make model inference unlimited.
- The local PC bridge is implemented as an opt-in read-only companion, but it is not connected until the Worker is deployed, a pairing code is generated, and the companion is started on Windows.
- Add individual user identity, per-user file ownership, explicit MCP write approvals, richer device revocation/approval controls, streaming UI, DOCX/XLSX ingestion, OCR, sandboxed general-purpose code execution, device task cancellation, and automated end-to-end tests before broad/public use.

## Security notes

Never put API tokens in HTML, JavaScript, committed configuration, or chat messages. Use Worker secrets. The Worker rejects requests without the configured password. It exposes only the documented chat, file, CSV-analysis, and web-search routes; it does not expose shell or local-file execution. Uploaded content is treated as untrusted data, not executable instructions.
