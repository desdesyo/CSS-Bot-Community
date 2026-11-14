# Local CSS Bridge — implementation specification

**Purpose:** create a real Windows-side agent that connects this ChatGPT conversation to the user's local Counter-Strike: Source v34 installation through a GitHub-controlled task queue. The agent must let the assistant inspect game files, collect diagnostics, prepare fixes, apply approved/safe repairs, and return verifiable results.

**Known game root:** `C:\\Games\\Counter-Strike Source v34`

**Repository:** `desdesyo/CSS-Bot-Community`

**Important status rule:** this document is a target implementation plan. None of the bridge capabilities are considered implemented until the corresponding code exists, builds, passes tests, and is exercised against a real CSS v34 folder.

## 1. Non-negotiable outcome

The finished bridge is not just a logger, screenshot helper, or one-way uploader. It must support this complete loop:

1. The assistant creates a structured repair/inspection task in GitHub.
2. The local Windows agent discovers the task without inbound ports or router configuration.
3. The agent validates the task, scope, and allowed paths.
4. The agent inspects the actual local CSS v34 installation and gathers requested evidence.
5. The evidence is returned to GitHub in a machine-readable report and human-readable summary.
6. The assistant analyzes the evidence and prepares a concrete patch or repair package in GitHub.
7. The local agent downloads and validates the patch, creates a rollback point, applies it according to policy, and runs verification.
8. The agent reports exact changed files, hashes, test results, errors, and rollback status.
9. The assistant uses that report to decide whether the issue is fixed or another repair iteration is needed.

The assistant must never claim local access, successful repair, or successful testing unless the agent has returned evidence proving it.

## 2. Connection model and honest platform boundary

A normal ChatGPT browser conversation cannot directly open arbitrary files on the user's PC or connect to a localhost process merely because a program is installed. The bridge therefore needs an explicit communication channel.

### First working transport: GitHub task queue

Use the existing private/authorized GitHub integration as the control plane:

- ChatGPT creates a task as a GitHub Issue (or a dedicated queue record) with a strict JSON payload.
- The local agent makes outbound HTTPS requests to GitHub on a polling schedule; no inbound listening port is required.
- The agent posts results as issue comments and uploads bounded diagnostic artifacts to a task branch/release when appropriate.
- ChatGPT reads the task result through the GitHub integration and continues the repair cycle.
- A task has a unique ID, status, timestamps, requested scope, and result reference. Duplicate delivery must not execute a repair twice.

This gives a real, auditable, asynchronous bridge to this conversation through GitHub. It is not a live remote desktop or an unrestricted shell.

### Later transport: direct ChatGPT tool connection

A direct interactive connection may be added only through a supported remote MCP/plugin/connector endpoint with authentication and explicit user authorization. Do not pretend that a local HTTP/WebSocket endpoint is directly callable from this chat. Keep the transport interface replaceable so GitHub queue and a future supported connector can share the same agent core.

## 3. Local agent architecture

Implement the Windows agent as a standalone **C#/.NET 8** application (no Python). Keep it separate from the game process and separate from the CSS Bot gameplay mod.

Suggested components:

- **Bridge.Host** — Windows background process/tray app; starts, stops, reports health, and manages configuration.
- **Bridge.GitHub** — authenticated outbound HTTPS client; polls tasks, posts results, downloads signed/hashed artifacts.
- **Bridge.TaskEngine** — validates task schema, permissions, state transitions, retries, and idempotency.
- **Bridge.FileSystem** — enumerates and reads only allowlisted roots; records file size, timestamps, SHA-256, PE metadata, and access errors.
- **Bridge.Diagnostics** — gathers game version/build indicators, DLL metadata, VDF/plugin configuration, crash dumps, logs, and dependency presence without assuming SourceMod is installed.
- **Bridge.Repair** — stages patches, creates backups, applies approved file operations, verifies hashes, and rolls back failed changes.
- **Bridge.TestRunner** — runs only explicitly allowlisted, bounded diagnostic commands/tests; captures stdout, stderr, exit code, timeout, and timestamps.
- **Bridge.Reporting** — emits JSON plus a readable Markdown report with evidence references.
- **Bridge.Security** — path traversal prevention, file-size limits, command allowlist, authentication, audit log, and permission policy.

Keep interfaces small and testable. The GitHub transport must not be coupled to file scanning or repair logic.

## 4. Security and repair policy

The agent must not become an unrestricted remote shell.

- Default allowed game root: `C:\\Games\\Counter-Strike Source v34`.
- Allow additional roots only through an explicit local configuration change.
- Reject paths outside allowlisted roots, UNC paths, device paths, traversal segments, symlinks/reparse-point escapes, and unexpected drive changes.
- Never upload the entire game directory by default. Upload only requested, bounded diagnostic files; redact tokens, credentials, usernames, and unrelated personal data.
- Never collect browser profiles, personal documents, passwords, or unrelated folders.
- Do not execute arbitrary commands or binaries received from GitHub.
- Use named diagnostic/test operations with strict argument schemas, timeouts, and output caps.
- Keep a local append-only audit trail of tasks, reads, writes, hashes, approvals, and results.
- Before any write, create a backup with original SHA-256 and a restore manifest.
- First release is read-only. Later releases may automatically apply low-risk, reversible repairs (for example, restoring a known config or replacing a file whose expected hash and trusted source are verified).
- DLL/EXE replacement, game binary changes, registry changes, deletion, and broad folder rewrites require an explicit approval policy. Do not silently overwrite unknown or user-modified files.
- If verification fails, roll back automatically and report both the original failure and rollback result.
- Never disable antivirus, Windows security, or platform protections.

## 5. Implementation phases and acceptance gates

### Phase 0 — repository and protocol foundation

Deliver:
- `bridge/README.md` with install/run/configuration instructions.
- Versioned JSON schemas for `BridgeTask`, `BridgeResult`, `FileRecord`, `RepairPlan`, and `RepairResult`.
- Task lifecycle: `queued -> claimed -> inspecting -> awaiting_patch -> patch_ready -> applying -> verifying -> completed|failed|rolled_back`.
- A threat model and explicit permission matrix.

Acceptance:
- Schemas validate known-good and reject malformed/oversized/unknown operations.
- Duplicate task IDs are idempotent.
- No local file writes are possible in this phase.

### Phase 1 — Windows agent and secure GitHub connection

Deliver:
- .NET 8 solution and Windows x64 build.
- Configuration for repository, task label/queue, polling interval, game root, and credential source.
- Outbound GitHub polling, task claiming, heartbeat, retry/backoff, and result comments.
- Token storage using Windows Credential Manager or DPAPI; never store tokens in source, logs, or plain config.
- GitHub Actions build and automated unit tests.

Acceptance:
- Agent starts on Windows, authenticates, receives a test task, posts a heartbeat/result, survives network interruption, and does not execute arbitrary task text.
- Build artifact is downloadable from a successful GitHub Actions run.

### Phase 2 — real CSS v34 filesystem inspection

Deliver:
- Safe recursive inventory of the known game root.
- Configurable exclusions and file-size caps.
- SHA-256 manifest, PE metadata for EXE/DLL, version/product fields, architecture, and dependency metadata where available.
- Detection of expected folders/files, missing files, zero-byte files, duplicate/conflicting DLLs, malformed VDF/config files, and inaccessible paths.
- Targeted collection of existing logs, crash dumps, and exception files.

Acceptance:
- A real scan of `C:\\Games\\Counter-Strike Source v34` returns a complete, bounded inventory and explicit skipped/error entries.
- The report distinguishes “missing”, “unreadable”, “not checked”, and “present”; it never guesses.
- The agent does not modify the game during inspection.

### Phase 3 — diagnostics and fault analysis

Deliver:
- Named diagnostic probes for game executable/DLL metadata, required folder layout, VDF plugin declarations, runtime dependencies, known engine/plugin compatibility markers, and log signatures.
- Comparison against versioned known-good manifests stored in GitHub.
- Evidence-linked diagnosis: each finding includes file path, observed value/hash, expected value/source, severity, and confidence.
- A repair recommendation generated from evidence, not from filename guesses alone.

Acceptance:
- Repeated scans of an unchanged installation produce stable manifests.
- Known test fixtures correctly identify missing, corrupted, incompatible, and healthy files.
- The report never marks a speculative issue as confirmed.

### Phase 4 — staged repair and rollback

Deliver:
- Repair plans stored as declarative JSON operations, not arbitrary scripts.
- Trusted artifact download with SHA-256 verification and source/provenance record.
- Backup/restore manifest, atomic staging, safe replacement, and rollback.
- Repair classes: configuration repair, known-file restoration, dependency repair, and plugin/DLL repair with stricter approval.
- Dry-run mode showing exact files and operations before applying.

Acceptance:
- Unit/integration tests prove backup restoration after simulated failure.
- A corrupted test fixture is repaired to the expected hash.
- Unknown or mismatched source files are rejected.
- Failed post-repair verification triggers rollback and a truthful report.

### Phase 5 — verification and autonomous repair loop

Deliver:
- Bounded test runner for file integrity and safe non-interactive checks.
- Optional game launch/health probe only after a dedicated safe test protocol exists; capture process exit, timeout, logs, and crash evidence.
- Assistant-driven loop: inspect -> diagnose -> patch in GitHub -> apply -> verify -> report -> repeat.
- Stop conditions for repeated failures, uncertain provenance, unsafe operations, or exhausted retry budget.

Acceptance:
- At least one documented end-to-end test starts with a deliberately damaged test installation, detects the fault, applies a verified repair, verifies the result, and records the full audit trail.
- The agent stops rather than guessing when evidence is insufficient.
- No claim of “game launches successfully” is made unless an actual launch test completed.

### Phase 6 — production packaging and maintenance

Deliver:
- Signed or otherwise provenance-verifiable Windows installer/package.
- Upgrade/uninstall flow, health status, logs, configuration backup, and recovery procedure.
- CI build, tests, release artifacts, versioning, changelog, and reproducible build instructions.
- Operator documentation and a minimal status view.

Acceptance:
- Clean install, upgrade, uninstall, and recovery are tested on Windows.
- A release artifact is attached to a GitHub Release and its hash is published.
- The agent can update itself safely without losing credentials or configuration.

## 6. First milestone: what to implement next

Do not start by writing a giant all-in-one “repair” script. The first code milestone is the smallest verifiable vertical slice:

1. Create the .NET 8 solution and schemas.
2. Implement secure GitHub task polling and a heartbeat/result response.
3. Add a read-only scan of the configured CSS v34 root.
4. Return a JSON manifest and Markdown summary to the originating GitHub task.
5. Add CI build and tests; publish a Windows x64 artifact.

Only after this vertical slice works on the real Windows machine should write/repair functionality begin.

## 7. Project constraints and known environment

- Known local CSS v34 path: `C:\\Games\\Counter-Strike Source v34`.
- The user wants development and source changes managed through GitHub.
- Do not use Python for this project.
- Do not require the user to manually inspect folders, copy logs, or run a long list of commands when the bridge can collect the same evidence.
- Do not depend on SourceMod; the native engine plugin path is a separate investigation and SourceMod was explicitly rejected in the recent project direction.
- Earlier investigation found that `plugin_print` works and reports no loaded plugins; engine commands include `plugin_load`, `plugin_unload`, and `plugin_print`, and the engine supports `addons/*.vdf`. This is a lead for later diagnostics, not proof that a plugin DLL is compatible.
- A prior SDK foundation did not contain the actual CS:S DLL, SDK, or bot integration. Do not confuse an engine-independent C++ core with a working in-game mod.
- The current CSS Bot Community repository is early development. Its README describes an experimental SourceMod bridge; that is not this Local CSS Bridge and must not be presented as satisfying this specification.

## 8. Definition of done

The bridge is “working” only when all of the following are demonstrated on the user's Windows PC:

- This conversation can create a task through GitHub and receive a result from the local agent.
- The agent can safely inspect the actual CSS v34 directory without manual file uploads.
- The assistant can identify a real fault from returned evidence.
- A verified repair package can be delivered through GitHub and applied under the defined policy.
- The agent can test the repaired files and return exact evidence.
- A failed repair can be rolled back.
- The complete cycle is repeatable, logged, and documented.

Until then, use precise statuses such as “protocol drafted”, “agent builds”, “GitHub connection tested”, “read-only scan tested”, “repair tested on fixture”, and “repair tested on the real game”. Never use “fully connected” or “autonomous repair working” prematurely.
