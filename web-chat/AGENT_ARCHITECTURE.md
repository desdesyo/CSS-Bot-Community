# Universal AI workspace — implementation architecture

## Product goal

Build a persistent, tool-using agent workspace for the user's real projects, not a text-only chatbot. The agent should research, create and revise files, inspect uploads, analyze data, generate media, develop software, manage long-running tasks, and preserve project decisions across conversations. Every external action must be auditable; the agent must report only verified outcomes.

This is broad capability, not an unlimited/unrestricted promise. Provider access, model quotas, network availability, legal constraints, and local machine permissions remain real boundaries.

## Platform decision

Use the Cloudflare Agents SDK as the target runtime rather than continuing to grow a single request/response Worker loop indefinitely.

- Durable Objects per user/conversation: stable identity, SQLite state, WebSockets, scheduling, and recoverable execution.
- Pi harness as the initial agent loop: transcript, tool execution, memory loading, streaming, and recovery. Keep the harness replaceable.
- MCP client manager: connect external tools through a standard protocol, with explicit allowlists and least-privilege credentials.
- Cloudflare Workflows / durable fibers: long-running multi-step jobs, checkpoints, retries, wait states, and resumable execution.
- Sandboxed workspace: isolated file system and code/data execution; never run arbitrary code in the main API Worker.
- Model router: provider adapters, capability registry, retries, circuit breaker, usage accounting, and optional fallback. Model availability must be tested, not assumed.
- Private R2 object storage: uploads, generated artifacts, 3D assets, and versioned outputs.
- Durable SQL: users, sessions, projects, messages, tasks, tool audit records, file ownership, and memory references.

Primary technical references:
- https://github.com/cloudflare/agents
- https://developers.cloudflare.com/agents/harnesses/
- https://developers.cloudflare.com/workflows/get-started/durable-agents/
- https://modelcontextprotocol.io/

## Capability modules

1. **Conversation and memory**
   - Stable conversation IDs and project workspaces.
   - Streaming, cancellation, reconnect/resume, message edit/retry.
   - Durable summaries plus searchable user-approved project memory.
   - Export/import and deletion controls.

2. **Files and repositories**
   - Private upload library with ownership checks.
   - GitHub repository browse/read/write, branches, commits, diffs, PRs, workflow results.
   - Current prototype has a restricted GitHub Contents API toolset: list/read/create/update UTF-8 files under `GITHUB_WORK_ROOT`, with commit evidence.
   - Extend to Git Trees API for binary assets and large changesets; never commit credentials.

3. **Research and browsing**
   - Search adapter with date/source metadata and citations.
   - Browser/computer agent for multi-step web workflows.
   - Source capture and evidence ledger.

4. **Documents and data**
   - PDF, DOCX, XLSX, CSV, images, OCR, audio/video transcription.
   - Deterministic parsing first; isolated code execution for advanced analysis.
   - Charts, tables, and downloadable reports.

5. **Software engineering**
   - Project inspection, planning, code editing, tests, builds, logs, diffs, release artifacts.
   - CI evidence required before describing a build as passing.
   - Separate local PCBridge with read-only inspection by default, allowlisted operations, and explicit approval for game-file modifications.

6. **3D and media**
   - Image generation/editing through a configured image provider.
   - 3D provider adapter for MoGen or another locally runnable/open-source geometry engine.
   - Generate procedural geometry and export GLB/OBJ/FBX/SMD where supported.
   - Store assets in R2 or Git LFS; GitHub text Contents API is not a binary asset pipeline.
   - Do not mark 3D generation as connected until a real model export is created and validated.

7. **Automation and connectors**
   - Scheduled/conditional jobs with status, cancellation, retries, and notifications.
   - MCP connectors for external services; per-connector OAuth and permission scopes.
   - No credentials pasted into chat.

## Security boundaries

- Authenticate individual users; remove shared-password-only access before public deployment.
- Enforce per-user ownership for threads, files, projects, memory, and jobs.
- Store secrets only in server-side secret storage.
- Treat all uploaded/retrieved content as untrusted data, never as system instructions.
- Require confirmation for destructive or external side-effect actions.
- Sandboxes have CPU, memory, time, disk, and network limits.
- The local CSS bridge stays separately authenticated and allowlisted; no arbitrary shell commands or silent writes to the game directory.

## Delivery sequence

### Stage A — current prototype hardening
- [x] Add GitHub workspace list/read/write tools with a configured repository and path root.
- [x] Make repository writes auditable Git commits.
- [x] Expand the per-request tool loop from 6 to 12 rounds.
- [ ] Add automated tests for path traversal, UTF-8/base64 round-trips, create/update behavior, and API failures.
- [ ] Verify CI and a real GitHub workspace write/read round-trip.

### Stage B — durable agent runtime
- [ ] Add Agents SDK + Durable Object conversation/session.
- [ ] Migrate transcript persistence from GitHub Issues to Durable SQL; retain export/backup.
- [ ] Add streaming and resumable turns.
- [ ] Add durable task queue/fibers and progress events.
- [ ] Add model adapter registry and circuit-breaker/failover.

### Stage C — broad tool surface
- [ ] MCP client manager and curated connector registry.
- [ ] Sandboxed code/data workspace.
- [ ] Browser/computer agent.
- [ ] DOCX/XLSX/OCR and media ingestion.
- [ ] Image and 3D generation adapters.
- [ ] Project memory, history search, scheduled automation.

### Stage D — production safety and verification
- [ ] Per-user identity and authorization.
- [ ] Per-user file/thread ownership and deletion.
- [ ] Rate limits, audit logs, backups, observability.
- [ ] Integration/e2e tests and external-network smoke tests.
- [ ] Deploy only after secrets, bindings, domain, quotas, and real end-to-end paths are verified.

## Current verified implementation status

The current deployed status is **not verified**. Source changes in this branch do not mean Cloudflare deployment has occurred. The new GitHub workspace tools are implemented in source but remain disabled until `GITHUB_WORK_REPO` and token permissions are configured. CI has not yet reported a passing run for these changes.
