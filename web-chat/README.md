# GitHub Chat

A small browser chat UI with conversation history stored in GitHub Issues and AI replies generated through the OpenAI Responses API. It is designed as a separate workspace alongside CSS Bot Community.

## Architecture

- Browser UI: `public/index.html`
- API and authentication: Cloudflare Worker in `worker.js`
- Conversation persistence: GitHub Issues with the `github-chat` label; each user/assistant turn is a comment.
- Model: OpenAI Responses API. Default is `gpt-4.1-mini`; override with `OPENAI_MODEL`.

The GitHub repository stores the application source and the conversation records. Cloudflare Workers serves the site and keeps API credentials server-side. A static GitHub Pages-only site is deliberately not used for API calls because it would expose secrets in browser code.

## Required Worker secrets

Set these with `wrangler secret put NAME`:

- `APP_PASSWORD` — a long, unique password for access to this private chat.
- `GITHUB_TOKEN` — fine-grained GitHub token for this repository with Issues read/write permission.
- `OPENAI_API_KEY` — API key for model responses.

Set Worker variables:

- `GITHUB_REPO` — defaults to `desdesyo/CSS-Bot-Community`.
- `OPENAI_MODEL` — defaults to `gpt-4.1-mini`.
- `ALLOWED_ORIGIN` — optional exact origin for CORS; leave unset for same-origin deployment.

## Deploy

Requires Node.js and Wrangler:

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
- The API sends the latest 40 comments as model context.
- GitHub Issues are visible to people who can access the repository. Use a private repository if conversation contents must be private; ensure the token can access it.
- API usage is billed by the model provider. GitHub/Cloudflare storage does not make model inference unlimited.
- No local PCBridge execution is wired into this prototype yet. That is a separate authenticated, allowlisted integration stage.
- Add rate limiting, stronger user identity, streaming, file attachments, and per-thread ownership checks before broad/public use.

## Security notes

Never put API tokens in HTML, JavaScript, committed configuration, or chat messages. Use Worker secrets. The Worker rejects requests without the configured password and only accepts chat operations; it does not expose shell or local-file execution.
