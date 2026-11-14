# GitHub Chat

A small browser chat UI with conversation history stored in GitHub Issues and AI replies generated through the OpenAI Responses API. It is designed as a separate workspace alongside CSS Bot Community.

## Architecture

- Browser UI: `public/index.html`
- API and authentication: Cloudflare Worker in `worker.js`
- Conversation persistence: GitHub Issues with the `github-chat` label; each user/assistant turn is a comment.
- Model: OpenAI Responses API. Default is `gpt-4.1-mini`; override with `OPENAI_MODEL`.

The public CSS Bot Community repository stores the application source only. Conversation records must go to a separate **private** GitHub repository. Cloudflare Workers serves the site and keeps API credentials server-side. A static GitHub Pages-only site is deliberately not used for API calls because it would expose secrets in browser code.

## Region-independent access requirement

The browser client must work as a normal HTTPS website without requiring the user to install or enable a VPN, proxy, or location-spoofing tool. The application must not request browser geolocation, inspect the user's country to choose a model, or change chat behavior based on the user's IP/location. User location is not part of the chat protocol or conversation identity.

The intended deployment is a globally reachable HTTPS endpoint on Cloudflare Workers (preferably on a stable custom domain), with all model-provider credentials and routing kept server-side. Provider selection and failover happen on the server and must not require any action from the user. Do not add client-side provider URLs, region selectors, VPN instructions, or geo-based UI branches.

**Honest availability boundary:** no application can guarantee access from literally every network or country. A government/network may block the domain or Cloudflare, GitHub may be unreachable, or a model provider may restrict API access from the server's egress region. These are upstream/network restrictions, not a reason to ask the user to use a VPN. For resilience, deploy the app on a stable domain and configure at least one independent, legally available server-side model provider endpoint; test the complete path from the intended hosting environment. Never claim worldwide availability until tested from multiple networks.

## Required Worker secrets

Set these with `wrangler secret put NAME`:

- `APP_PASSWORD` — a long, unique password for access to this private chat.
- `GITHUB_TOKEN` — fine-grained GitHub token for this repository with Issues read/write permission.
- `OPENAI_API_KEY` — API key for model responses.

Set Worker variables:

- `GITHUB_REPO` — required; set to a separate private repository such as `your-account/private-chat-history`. Do not point this at the public CSS Bot Community repository.
- `OPENAI_MODEL` — defaults to `gpt-4.1-mini`.
- `ALLOWED_ORIGIN` — optional exact origin for CORS; leave unset for same-origin deployment. This is a browser security setting, not a geographic restriction.

## Deploy

First create a separate **private** GitHub repository for conversation history. Create a fine-grained token limited to that private repository, with Issues read/write permission. The chat Worker stores message text in GitHub Issue comments, so anyone with access to that private repository can read it.\n\nSet the `GITHUB_REPO` Worker variable to that private repository before deploying.\n\nRequires Node.js and Wrangler:

```sh
cd web-chat
npm install -g wrangler
wrangler login
wrangler secret put APP_PASSWORD
wrangler secret put GITHUB_TOKEN
wrangler secret put OPENAI_API_KEY
wrangler deploy
```

Cloudflare serves `public/index.html` and routes `/api/*` to the Worker. Keep all three secrets out of GitHub files and browser code.

## Current scope / limitations

- Text-only conversations in this first prototype.
- Each conversation is a GitHub Issue; turns are comments.
- One visible conversation is a chain of GitHub Issues. When the context grows beyond the rollover threshold, the Worker creates a continuation automatically and writes a durable summary of goals, decisions, constraints, project facts, and unfinished tasks. The browser keeps the same root conversation ID and does not show a new chat.
- The Worker retries transient GitHub/model errors and can use an optional OpenAI-compatible backup provider when configured (`FALLBACK_API_URL`, `FALLBACK_API_KEY`, `FALLBACK_MODEL`). The browser silently retries failed requests and preserves the unsent draft instead of displaying infrastructure errors.
- This is best-effort continuity, not guaranteed infinite uptime: if all providers, credentials, or usage quotas are unavailable, no model can produce a reply. The interface avoids exposing internal provider/tool messages; it cannot manufacture an answer while all backends are offline.
- Chat history is only as private as the dedicated repository. The Worker refuses to operate unless `GITHUB_REPO` is explicitly configured; never use the public source repository for conversation storage.
- API usage is billed by the model provider. GitHub/Cloudflare storage does not make model inference unlimited.
- No local PCBridge execution is wired into this prototype yet. That is a separate authenticated, allowlisted integration stage.
- Add rate limiting, stronger user identity, streaming, file attachments, per-thread ownership checks, and automated rollover/failover integration tests before broad/public use.

## Security notes

Never put API tokens in HTML, JavaScript, committed configuration, or chat messages. Use Worker secrets. The Worker rejects requests without the configured password and only accepts chat operations; it does not expose shell or local-file execution.
