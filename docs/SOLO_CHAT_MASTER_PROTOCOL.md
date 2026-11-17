# SOLO.Chat — Master Development Protocol and Target Architecture

Status: binding engineering specification; implementation is incremental and must be evidenced by CI and deployment.
Target: `desdesyo/CSS-Bot-Community` / `github-chat-prototype`.
Canonical application: https://cssbc-github-chat.descapan.workers.dev/

## 1. Non-negotiable execution protocol

1. Treat every user request as a change request against the existing product. Read `AGENTS.md`, this protocol, the interaction contract, current task queue, branch head, relevant source, recent CI/deploy runs and open issues before planning.
2. Do not ask the user to repeat facts already in conversation, memory, repository, connected GitHub or paired computer evidence.
3. Translate each request into explicit deliverables, acceptance criteria, dependencies, security constraints and verification steps. Preserve all explicit user requirements and corrections.
4. Orchestrator plans only. Implementer changes code. Independent tester is read-only. Supervisor is the only role allowed to accept completion. No agent may approve its own work.
5. Read before write. Make the smallest coherent patch. Never replace a complete subsystem or overwrite unrelated changes to save time.
6. Every code change must be committed to the intended branch. Every changed behavior must have automated tests. For `web-chat/**`, require checks and successful deployment of the exact same commit SHA.
7. Report status truthfully: DONE only with implementation link, passing CI link, exact-SHA deployment evidence when applicable, and acceptance-test evidence. Otherwise use BLOCKED, IN PROGRESS or REJECTED.
8. A queued, skipped, cancelled, timed-out, stale-SHA or missing workflow is not a pass. A model assertion is not a runtime test. A deployment is not proven by a source commit.
9. If a limit or dependency blocks the requested path, first investigate a safe alternative architecture and implement a configurable, testable fallback. Never claim literal unlimited capacity: every provider has quotas, costs, throughput and retention constraints.
10. Do not expose credentials, private user files, session contents, pairing secrets or raw authorization headers in logs, model prompts, issue bodies or public repositories.

## 2. Task lifecycle / acceptance gate

Every task issue must contain:
- unique `Task-Key`;
- Objective;
- Scope and explicitly excluded work;
- Acceptance criteria phrased as observable behavior;
- Security/privacy constraints;
- Test plan;
- Evidence links (implementation commit, CI run, deployment run, artifacts).

Allowed states: `status:queued` -> `status:in-progress` -> `status:review` -> `status:done`. A task may instead be marked blocked/rejected with a reason. Exactly one `status:*` label is allowed. Only Supervisor may transition to done. Reopening a task invalidates prior acceptance when the branch head or relevant deployment changes.

## 3. Agent team responsibilities

- **Orchestrator:** resolve project and branch, inspect requirements and state, split work into dependency-ordered tasks, identify risks and acceptance tests. No repository writes.
- **Implementer:** execute the plan, use least-privilege tools, add tests, commit focused changes and return exact evidence. No self-approval.
- **Independent tester:** inspect diff and current branch independently; execute or inspect actual tests; return PASS/REJECT with criterion-by-criterion evidence. Read-only.
- **Supervisor:** verify tester report, exact branch SHA, CI, deployment and acceptance evidence; reject stale or missing evidence.
- **Health monitor:** exercise real authenticated health and real model inference, monitor latency/error rates/storage and create deduplicated repair tasks.
- **Secret provisioning agent (target capability):** inventory required secret names and scopes, validate configuration, generate only non-provider credentials/rotatable random values, and create/update GitHub Actions secrets through the GitHub Secrets API only when an explicitly authorized bootstrap credential with Actions-secret write permission is present. It must never print or persist secret values. It cannot mint a GitHub PAT, elevate its own permissions, bypass owner approval, or create a provider API key without that provider's authorized flow. Report names/status only.
- **Recovery agent:** diagnose failed jobs, make at most one bounded repair attempt per task, rerun checks, then escalate with logs and exact blocker. No infinite retry loops.

## 4. Credentials and GitHub secrets

- Use repository-scoped Actions secrets unless organization-level sharing is demonstrably required.
- Bootstrap credentials must be created by the repository owner in GitHub settings or an approved GitHub App installation. Do not request a PAT in chat and do not commit it to a file.
- Candidate secret inventory must be derived from actual workflow references, not guessed. Current known workflow references include `CSSBC_CHAT_APP_PASSWORD`, optional `CSSBC_CHAT_ENDPOINT`, and deployment/provider credentials referenced by the deployment workflow. Re-inventory before changes.
- The GitHub Actions `GITHUB_TOKEN` is short-lived and permission-scoped; it does not automatically have permission to manage repository Actions secrets. Never assume it can create secrets.
- A secret agent may create derived secrets only after bootstrap permissions and required values are supplied through a secure runtime channel. Never echo values in outputs, logs, artifacts or issue comments. Verify by reading secret metadata (name/update timestamp only), not by retrieving the value.
- If the current connector/API does not expose the GitHub Actions secrets endpoints, mark provisioning BLOCKED and provide the exact owner-side setup step. Do not simulate success.

## 5. Storage and file-upload target

The old 15 MB setting is a per-file application limit, not proof of total storage capacity. Do not simply raise a frontend constant.

Target design:
- Store file bytes in Cloudflare R2 (or another object store behind a storage adapter); keep metadata, ownership, checksums, status and references in Durable Objects/SQLite. Avoid storing large binary payloads in chat issue comments, Git blobs or Durable Object values.
- Use direct-to-object-store multipart/resumable uploads with short-lived, single-object scoped upload authorization. The Worker should authorize, issue/complete upload sessions and verify ownership/checksum; large bytes should not transit the model runtime.
- Initial product default: 250 MiB per file, configurable by environment. Hard ceiling must be provider/configuration-aware and enforced server-side. Support larger files through multipart upload rather than raising request-body limits blindly.
- Enforce per-user quota, total account quota, concurrency limits, rate limits, retention policy, MIME/extension validation, content sniffing, malware scanning where available, checksum verification and deletion lifecycle. Show quota usage and precise rejection reasons.
- Maintain an adapter interface so R2 can be replaced without rewriting chat/UI logic. No provider-specific URL or bucket key may be trusted from the browser.
- Upload UX: drag/drop, paste image, file picker, progress, cancel, retry/resume, remove-before-send, clear errors and mobile camera/file selection.
- Files must be private and access-controlled. Public repository storage is prohibited for user uploads and conversation content.

## 6. Archive support

- Support ZIP and RAR as import formats through a server-side archive adapter. ZIP may use a maintained library; RAR requires a maintained, legally distributable decoder/runtime or an isolated external extraction service. Do not claim RAR support until real RAR4/RAR5 fixtures pass.
- List archive contents before extraction; allow selective extraction. Reject path traversal, absolute paths, symlinks escaping the extraction root, hardlinks, device files, encrypted archives when unsupported, malformed headers and unsupported compression methods.
- Enforce limits for compressed size, expanded size, file count, nesting depth, compression ratio, CPU time and memory. Never extract blindly or execute archive contents.
- Extract into a private temporary object prefix; verify each output and clean up on failure/expiry. Preserve original archive unless the user deletes it.

## 7. Autonomous agent architecture

Target flow: authenticated user request -> task normalizer -> policy/permission gate -> planner -> dependency scheduler -> specialist workers -> independent verifier -> supervisor -> artifact/deployment publisher -> live status event.

- Use durable task IDs, idempotency keys, explicit state transitions, leases/heartbeats, bounded retries, dead-letter queue and cancellation.
- Every agent receives only its task scope, relevant context and least-privilege tools. No universal unrestricted tool token.
- Use a durable event log for task events and a compact current-state projection for UI. Reconnect must replay from cursor; no full page reload required.
- Self-repair may diagnose, open a repair task, patch code and run tests. It must not silently change security policy, permissions, billing limits, secrets, or destructive user data.
- The phrase "self-improving" means versioned, evidence-backed skills and regression benchmarks, not unsupervised model retraining. Promote reusable procedures only after independent repeat verification.

## 8. Context and conversation memory

- Persist the full conversation privately; do not rely on a rolling in-memory prompt as the source of truth.
- Maintain a compact, versioned conversation summary with goals, constraints, decisions, corrections, unresolved tasks and artifact references. Update asynchronously after committed turns and on explicit checkpoints.
- Retrieval must select relevant messages/files by task and recency. Keep source message IDs so every summary fact can be traced and corrected.
- Context compaction must never discard explicit user constraints, safety boundaries, project identity, branch/commit references or unresolved acceptance criteria. Recent user corrections override older summaries.
- Summary updates are debounced/background jobs; the visible chat must not wait for summarization. Use incremental updates and optimistic UI; avoid full transcript rerenders.

## 9. User interface and mobile

- Keep the existing visual identity and working desktop experience. Implement responsive layouts from narrow phones upward; no horizontal page overflow.
- Add a collapsible side navigation. The initial information architecture reserves: Chat, **FL Studio**, **Generated files**, **Conversation summary**, and Archive. Additional menu destinations remain intentionally unspecified until user discussion.
- FL Studio is a distinct workspace, not just a generic chat filter. Generated files is a durable artifact library with preview, metadata, version, download and delete actions. Conversation summary is a concise live-updating view with source traceability.
- On mobile, the side navigation becomes an accessible drawer/bottom sheet; chat composer remains reachable above the keyboard; touch targets, safe areas, file picker, image preview and scrolling are tested on real viewport sizes.
- Every visible control must perform a real operation. Use accessible labels, keyboard navigation, focus management, reduced-motion support and loading/error/empty states.

## 10. Realtime performance

- Use SSE or WebSocket events for generation, task status, upload progress and summary updates. Reconnect with exponential backoff and cursor-based replay.
- Keep separate event channels/scopes for conversation, task telemetry and upload state. Coalesce high-frequency progress events; do not rerender the entire transcript on each token.
- Persist messages and events before acknowledging them. Deduplicate by stable IDs. Preserve drafts, active generation, selected conversation and scroll position during reconnects.
- Add performance budgets and tests for long conversations, multiple uploads, mobile layout, reconnects and concurrent agent tasks.

## 11. Verification matrix

No release is accepted without:
- TypeScript compile and unit/regression suite;
- authentication/authorization and secret-redaction tests;
- upload boundary, quota, resume, cancellation and checksum tests;
- ZIP/RAR malicious archive fixtures and decompression-bomb tests;
- context compaction/retrieval fidelity tests;
- agent lifecycle, retry, cancellation and stale-SHA supervisor tests;
- desktop and mobile viewport/E2E tests;
- authenticated live health/model smoke test;
- successful deployment for exact source SHA and post-deploy smoke test.

## 12. Delivery format

Every user-facing completion report must separate:
- Implemented (commit and files);
- Verified (tests and links);
- Deployed (exact SHA and live smoke evidence);
- Blocked (specific missing permission, secret, provider capability or user approval);
- Remaining queue (ordered, testable tasks).

Never use "unlimited", "fully autonomous", "self-healing" or "RAR supported" as a completion claim without measurable acceptance evidence.


## 10. SOLO.Chat interface self-maintenance

- The implementer has a dedicated `solo_ui_write_file` capability for the public interface in `web-chat/public/` on `desdesyo/CSS-Bot-Community/github-chat-prototype`.
- Allowed file types are HTML, CSS, JavaScript and JSON. This grants ordinary visual/UI changes (layout, colors, typography, spacing, responsive behavior, panels, controls and UI settings) without per-change user approval.
- The agent must read the current version first, make a focused change, preserve existing functionality, add/update automated tests and commit the change.
- The dedicated writer cannot modify backend runtime code, secrets, deployment credentials or files outside the public UI directory.
- UI changes are not complete until GitHub Chat checks pass and the exact same commit SHA is successfully deployed. Report commit, CI and deployment evidence separately.


## 11. Autonomous tool execution and live UI inspection

- The Pi Durable Harness must use tool-capable providers when configured: Gemini, OpenRouter, OpenAI and Groq. Cloudflare Workers AI remains the last-resort provider; an exhausted Cloudflare quota must not force a text-only fallback when an external tool-capable key is configured.
- Text generation health is not proof of tool execution. Deployment smoke tests must call `/api/agent/harness-check` and require the registered diagnostic tool to execute successfully.
- The authenticated browser automatically sends a privacy-filtered UI inspection snapshot after login and on viewport changes. It contains UI element labels, geometry, selected computed styles and clipping/overflow diagnostics; it excludes chat messages, typed text, password fields and conversation content.
- Before editing the interface, the agent calls `solo_ui_inspect`, reads the current UI source, applies a focused change, adds tests and verifies the exact commit's CI/deployment.
- CSS v34 baseline: authoritative source `desdesyo/CSS-Bot-Community@sdk-foundation`; staging workspace `desdesyo/modhaul@main`; chat `desdesyo/CSS-Bot-Community@github-chat-prototype`; game root `C:\\Games\\Counter-Strike Source v34`. Win32 VSP, integrated v34 GameDLL and installer all built successfully in workflow run `43487000595` at commit `e76ad4a7dcbc08e125aa73092596cc875b8cccc2`. The integration script inserts `cssbc::sdk::OnBotUpdate(this)` into `CCSBot::Update`; this proves a build, not an in-game test. SourcePawn prototype exists at `sourcemod/scripting/cssbc.sp`, but is optional and not the target native GameDLL architecture. `modhaul@main` currently has only `cssbc.smx` and `native/CSSBC_Native.cpp`. Older `SDK_INTEGRATION.md` and `ARCHITECTURE.md` statements that no GameDLL integration exists are stale; see `agent-skills/css-v34-project-context.md`.


## 13. GitHub write access and isolated UI writer

- The short-lived GitHub Actions token passed by the orchestrator is preferred over the persistent Worker token. This prevents a weaker Worker PAT from shadowing the task-scoped `GITHUB_TOKEN` that has Contents write permission.
- GitHub API errors must report the response message, `X-Accepted-GitHub-Permissions` and request ID, never the token.
- `solo_github_write_check` verifies repository write permission by creating a uniquely named temporary branch, committing a probe file, then deleting the branch. Report the commit URL and cleanup state; if GitHub returns 403, report the exact accepted permissions and the minimum required scope.
- The dedicated UI writer uses the isolated `github-chat-prototype` branch, never `main`. This is the documented serial-writer equivalent to per-task PRs: the global agent builder concurrency group processes one task at a time; each Contents API write includes the current file SHA (stale concurrent writes fail rather than overwrite); every commit triggers exact-SHA checks and deployment; the production/default branch is not edited. Do not claim a PR was created.
- Browser-started GitHub writes use the Worker secret `CSSBC_GITHUB_TOKEN`. The token exists in the current deployment, but the latest user-reported probe returned HTTP 403 on temporary-ref creation. Do not report the token as missing; use `solo_github_write_check` and the accepted-permissions header to distinguish insufficient Contents permission from repository policy.
