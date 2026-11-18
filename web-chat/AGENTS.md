# SOLO.Chat agent entrypoint

This file is the fast-start guide for work in `web-chat/`. Read it before editing the runtime. It is an index, not a replacement for the detailed contracts.

## Canonical project coordinates

- Repository: `desdesyo/CSS-Bot-Community`
- SOLO.Chat development/deployment branch: `github-chat-prototype`
- Worker name: `cssbc-github-chat`
- Live app: https://cssbc-github-chat.descapan.workers.dev/
- Worker source: `web-chat/agent-runtime/src/index.ts`
- Browser UI: `web-chat/public/index.html`
- Worker config: `web-chat/wrangler.toml`
- Package/test commands: `web-chat/package.json`

Do not switch to `main`, `sdk-foundation`, or `modhaul` for SOLO.Chat runtime work. Do not infer that a feature exists merely because a plan describes it.

## Read only the relevant contract

| Task | Read first |
|---|---|
| General runtime/UI change | this file, then the relevant source and tests |
| Agent roles, issue lifecycle, orchestration | `agent-team/README.md`, `web-chat/AGENT_TEAM_EXECUTION_PLAYBOOK.md` |
| Runtime architecture / tool harness | `web-chat/AGENT_ARCHITECTURE.md` |
| User-facing behavior / chat UX | `web-chat/USER_INTERACTION_CONTRACT.md` |
| Feature planning and parity | `web-chat/FEATURE_PARITY.md` |
| Deployment / secrets / endpoints | `web-chat/README.md`, `.github/workflows/deploy-github-chat.yml` |
| Recovery / live acceptance | `docs/SOLO_CHAT_RECOVERY_CHECKLIST.md` |
| GitHub task queue | `agent-team/TASK_QUEUE.md` |

Avoid loading every long specification for a narrow bug. Resolve conflicts in this order: current source + tests + active workflow configuration, then this entrypoint, then detailed plans/specifications. Plans are not implementation evidence.

## Source map

- `agent-runtime/src/index.ts` — Worker routes, auth, Durable Object `AgentSession`, Pi agent lifecycle, tools, GitHub API bridge, MCP endpoint, image generation and durable conversation state. Search for the exact route/function before reading large ranges.
- `public/index.html` — browser UI, client API calls, rendering, composer, streaming and client-side state.
- `worker.js` — legacy/auxiliary Worker entry; verify whether a path is still used before changing it.
- `wrangler.toml` — Worker identity, assets, AI binding, Durable Object binding/migrations and repository/model variables.
- `mcp-bridge/` — local stdio MCP client/config example.
- `tester.mjs` — runtime regression assertions, including API-map freshness.
- `API_MAP.md` — generated inventory of Worker routes, browser API references, and registered agent/MCP tools.
- `api-map.mjs` — source-driven API map generator and CI freshness validator (`npm run api:map` / `npm run api:check`).
- `AGENT_ARCHITECTURE.md` — architecture and capability boundaries.
- `AGENT_TEAM_EXECUTION_PLAYBOOK.md` — operational roles and acceptance rules.
- `IMPLEMENTATION_AND_ACCEPTANCE.md` — implementation/acceptance checklist.

## Fast validation

Run from `web-chat/`:

```bash
npm install
npm run check
npm run api:check
npm test
```

Deployment workflow: `.github/workflows/deploy-github-chat.yml`.
Regression workflow: `.github/workflows/github-chat-check.yml`.
Live E2E workflow: `.github/workflows/github-chat-e2e.yml`.

A green type-check or unit/regression suite is not proof of a live deployment. A deployment is not proof that GitHub writes, agent tools, model inference, or browser UX work. Report each layer separately and link the exact Actions run.

## Integration boundaries

- Browser -> authenticated Worker API -> Durable Object `AgentSession` -> Pi harness/model/tools.
- GitHub workspace access from the Worker uses the Worker secret `GITHUB_TOKEN`; the ChatGPT GitHub connector is a separate identity and permission path.
- The deploy workflow copies GitHub Actions repository secrets into Cloudflare Worker secrets. Updating a GitHub secret does not itself deploy; a deploy run must execute.
- The local computer bridge is a separate paired companion. A successful GitHub/Worker test does not prove local PC access.
- The remote MCP endpoint is a separate narrow interface; do not assume it exposes the whole agent toolset.
- Keep credentials out of files, issues, logs, commits and chat messages.

## Required change protocol

1. Confirm current branch and head SHA; inspect the exact file and nearby tests before editing.
2. Trace the caller -> implementation -> persistence/side effect -> UI/report path. Do not patch only the visible symptom.
3. Make the smallest coherent change. Preserve public API shapes and durable-storage compatibility unless migration is explicitly part of the task.
4. Add or update a regression test for the failure mode. Prefer deterministic tests over mocks presented as live evidence.
5. Run type-check and regression tests. For route/auth/GitHub/deployment changes, run the relevant live E2E workflow too.
6. Inspect the diff and workflow logs. Never report PASS from a queued, pending, cancelled, skipped or incomplete run.
7. State exact commit, tests, live checks, failures and blockers. If a live check was not run, say so.

## GitHub permission diagnostics

For Worker GitHub calls, inspect the actual endpoint and response status. Typical minimum fine-grained token permissions for the configured workspace are:
- Metadata: read (GitHub-required repository metadata)
- Contents: read/write (workspace file/branch/commit operations)
- Issues: read/write (agent task queue and `/fix`)
- Actions: read (dashboard workflow status)

Do not ask for or print token values. Never infer token validity from the existence of a non-empty secret; verify a real API operation. A 403 must be diagnosed by endpoint and accepted-permissions/error details where available.

## Avoid these time-wasters

- Do not repeatedly dump the full 16 KB root `AGENTS.md` or 39 KB interaction contract when a narrow section/source file is enough.
- Do not scan the entire repository before every small edit; use the source map and targeted search/read.
- Do not trigger multiple deploys for the same SHA. Check concurrency and current run state first.
- Do not change Cloudflare secrets, custom domains, DNS, or account settings through guessed APIs.
- Do not make broad rewrites of `index.ts` or `index.html` to fix a localized defect.
- Do not mark a roadmap item done from documentation alone.

## Definition of done

A code change is done only when the diff is committed, the targeted tests pass, the relevant regression suite passes, and any required live checks pass. Deployment-only work additionally requires authenticated health/version verification. If any layer is unavailable, label it BLOCKED/NOT VERIFIED instead of PASS.


## CI efficiency notes

- The deploy workflow is intentionally path-filtered to runtime code, browser assets, Worker config/dependencies, and the deploy workflow itself. Documentation-only changes should not deploy the Worker.
- The current `web-chat/package.json` has no tracked lockfile in this branch; CI currently uses `npm install`. Do not change this to `npm ci` until a committed lockfile is added.
- GitHub Actions may cancel superseded runs while commits arrive quickly. Inspect the run's exact `head_sha`; a successful run for an older SHA is not evidence for the current branch head.
