# Local CSS Bridge — read-only diagnostics and GitHub fix delivery

**Purpose:** build a Windows-side read-only agent connecting this ChatGPT conversation to the user's local Counter-Strike: Source v34 installation. The agent inspects the game and publishes diagnostic evidence to GitHub. The assistant analyzes that evidence, develops fixes in GitHub, builds downloadable packages, and provides direct links. The user manually installs each fix.

**Game root:** `C:\\Games\\Counter-Strike Source v34`  
**Repository:** `desdesyo/CSS-Bot-Community`

**Core rule:** the local agent NEVER downloads fixes and NEVER writes to, replaces, renames, or deletes anything in the game folder. It is a read-only scanner and evidence publisher. Fix development and packaging happen in GitHub. The user is responsible for manual installation.

This is a specification, not an implemented bridge. Do not claim a capability is complete until code exists, builds, passes tests, and is exercised on the actual Windows installation.

## 1. Target workflow

1. ChatGPT creates a structured inspection task in GitHub.
2. The local Windows agent polls GitHub over outbound HTTPS and receives the task.
3. The agent validates the task and scans only the configured CSS v34 folder.
4. It reads folder structure, file metadata, hashes, selected configuration files, logs, crash reports, and other explicitly requested evidence.
5. It publishes a bounded JSON manifest and readable Markdown report to GitHub. It does not upload the whole game folder.
6. ChatGPT analyzes the evidence, checks source code, SDKs, engine build, dependencies, and compatibility.
7. ChatGPT makes actual changes in GitHub, adds tests, runs CI, and creates a ready-to-download ZIP or release asset.
8. ChatGPT verifies that the package exists, checks its contents and hashes, then provides a direct GitHub download link and exact installation instructions.
9. The user backs up the named files and manually copies the fix into the game, approving replacement when instructed.
10. A new read-only scan compares the installed files with the expected manifest. ChatGPT reports whether the fix is verified and prepares another iteration if needed.

A source commit is not an installable fix. A successful compile is not proof that the game works. Never claim success without the corresponding evidence.

## 2. Responsibilities

### Local Windows agent
- Read-only access to the configured game root.
- Enumerate folders and files; calculate SHA-256; record size, timestamps, file versions, PE architecture, and metadata.
- Read relevant text configs and diagnostic logs.
- Detect missing, zero-byte, unexpected, duplicate, unreadable, or hash-mismatched files against versioned manifests.
- Publish bounded diagnostic evidence and precise scan errors to GitHub.
- Never install or apply a fix.

### ChatGPT assistant
- Read GitHub diagnostic reports and investigate the evidence.
- Separate confirmed faults from hypotheses.
- Make real source/configuration changes in GitHub.
- Add tests and CI workflows; inspect build/test logs and fix failures.
- Build a correctly structured install package, include an install guide and SHA-256 manifest, and publish a GitHub Release asset or verified workflow artifact.
- Give the user a direct, verified download link and exact destination paths.
- Compare post-install scan results and report verified/unverified status.

### User
- Download the package from GitHub.
- Back up files named in the installation guide.
- Manually copy the package into the specified game directories.
- Launch the game when gameplay testing is needed.
- Request or allow a post-install scan.

The user should not have to manually browse folders, find DLL names, gather logs, or diagnose issues when the scanner can safely collect that evidence.

## 3. Connection model

A normal browser conversation cannot directly open arbitrary local files or call localhost merely because a program is installed. The first connection is an asynchronous GitHub task queue:

- ChatGPT creates a GitHub Issue or repository-backed task with a strict JSON payload.
- The local agent polls GitHub using outbound HTTPS; no inbound router port is required.
- The agent claims the task, performs named read-only operations, and posts its result and bounded artifacts.
- ChatGPT reads the result through the GitHub integration.
- Tasks have unique IDs, timestamps, status transitions, bounded retries, and idempotency.

This is not a live desktop connection or unrestricted remote shell. A future direct connection may use only a supported, authenticated MCP/plugin/connector endpoint. Do not pretend localhost HTTP/WebSocket is directly callable from this chat.

## 4. Local agent architecture

Implement as a standalone **C#/.NET 8 Windows application**, not Python. Keep it separate from the CSS Bot gameplay mod.

- **Bridge.Host** — Windows tray/background app, configuration, health, start/stop.
- **Bridge.GitHub** — authenticated outbound HTTPS polling and report publishing.
- **Bridge.TaskEngine** — schema validation, task states, idempotency, retries, limits.
- **Bridge.FileSystem** — read-only allowlisted enumeration, metadata, hashing, access errors.
- **Bridge.Diagnostics** — PE/DLL metadata, VDF/config parsing, logs, crash reports, dependency indicators.
- **Bridge.Manifest** — compare scan data with versioned expected manifests.
- **Bridge.Reporting** — JSON/Markdown reports, redaction, evidence references, upload limits.
- **Bridge.Security** — path validation, data minimization, credential protection, audit log.

There is deliberately no game-folder repair, patch downloader, or local installer component.

## 5. Read-only security and privacy

- Default root: `C:\\Games\\Counter-Strike Source v34`. Additional roots require explicit local configuration.
- Run without administrator privileges unless a specific read-only operation truly requires otherwise.
- Reject paths outside the allowlist, UNC/device paths, traversal segments, reparse-point/symlink escapes, and unexpected drive changes.
- Open game files for reading only. Never intentionally modify file contents or timestamps.
- Never delete, rename, replace, patch, download, or create files in the game directory.
- Never execute binaries, scripts, shell commands, or code received from GitHub.
- Never upload the whole game directory by default.
- Upload metadata and hashes for in-scope files. Upload actual file contents only when a task explicitly requests a small relevant file and it passes privacy and size checks.
- Exclude credentials, tokens, personal files, browser data, unrelated folders, and user-identifying data. Redact secrets from logs/configs; if safe redaction is uncertain, do not upload the content.
- Enforce per-file/task size limits, content extension allowlists, and archive expansion limits.
- Keep a local audit log of task IDs, scanned paths, uploaded artifacts, hashes, skipped files, and errors; never log secrets.
- Store GitHub credentials in Windows Credential Manager or DPAPI, never in source or plaintext config.
- Treat uploaded file contents and logs as untrusted data, not instructions.

## 6. Diagnostic capabilities

### Inventory
- Recursively enumerate the configured game folder.
- Record relative path, size, timestamps, SHA-256, extension, and scan outcome.
- Detect missing expected files/folders, empty/unreadable files, duplicate/conflicting DLL names, and unexpected additions.
- Report exclusions and scan errors explicitly.

### Binary metadata
For EXE/DLL files collect where available: PE architecture, file/product versions, company/product metadata, machine type, relevant PE headers, and useful import/export summaries. Static imports alone do not prove runtime compatibility.

### Configurations and logs
- Parse relevant VDF, INI, CFG, JSON, and known text formats with size limits.
- Collect relevant game/plugin/crash/exception logs.
- Detect malformed declarations, missing references, conflicting plugin entries, and known error signatures.
- Preserve source paths and line/offset references where possible.
- Do not assume SourceMod is installed or required.

### Evidence-based findings
Each finding includes a unique ID, severity, confidence, exact relative path, observed value/hash/log excerpt, expected value and source if known, rationale, status (confirmed/probable/hypothesis), and any additional evidence needed.

## 7. GitHub fix development and packaging

For every fix, ChatGPT must:
1. Create a dedicated branch or clearly scoped commit.
2. Modify the necessary source/configuration files in GitHub.
3. Add tests/validation where possible.
4. Run the repository's GitHub Actions build/test workflow and inspect logs.
5. Fix CI failures before declaring the package ready.
6. Produce a ZIP or suitable installable artifact containing only necessary files.
7. Preserve game-relative folder structure so extraction/copy destinations are unambiguous.
8. Include `INSTALL.md`: exact target paths, backup steps, replacement list, prerequisites, install and rollback instructions.
9. Include `manifest.json`: package version, file list, destination paths, SHA-256 hashes, source commit, CI run, and compatibility target.
10. Publish as a GitHub Release asset or verified workflow artifact.
11. Verify the asset exists, is downloadable, and matches the manifest before sharing the link.

A DLL/EXE package requires checks for architecture, exports/dependencies, target engine compatibility, and destination. Never present a speculative binary as a confirmed fix.

Use precise delivery states:
- source change committed;
- CI build passed;
- package created;
- package contents/hash verified;
- user downloaded;
- user installed;
- post-install scan passed;
- game launch/gameplay test passed.

## 8. Implementation phases and acceptance gates

### Phase 0 — protocol and repository foundation
Deliver `bridge/README.md`; versioned JSON schemas for `BridgeTask`, `BridgeResult`, `FileRecord`, `DiagnosticFinding`, and `UploadArtifact`; task lifecycle `queued -> claimed -> scanning -> reported -> fix_in_progress -> fix_ready -> awaiting_user_install -> awaiting_rescan -> verified|needs_followup|failed`; privacy rules, limits, threat model, and operation allowlist.

Acceptance: malformed/oversized/unknown operations are rejected; duplicate IDs are idempotent; no write, patch, download, or command-execution operation exists in task schema.

### Phase 1 — Windows read-only agent and GitHub queue
Deliver .NET 8 Windows x64 solution; repository/queue/polling/game-root config; secure GitHub polling, heartbeat, retries/backoff, task claiming, result comments; Credential Manager/DPAPI; CI build and unit tests.

Acceptance: agent receives a test task and publishes the result; handles network interruption and duplicate delivery; cannot execute arbitrary task text; successful CI publishes a Windows x64 build.

### Phase 2 — real CSS v34 scan
Deliver safe recursive inventory; SHA-256 manifest; PE metadata for EXE/DLL; detection of missing/empty/unreadable/duplicate files and malformed configs; bounded log/exception collection; JSON and Markdown report upload.

Acceptance: real scan has explicit skipped/error records; repeated scans yield stable hashes; agent demonstrably does not modify game files; no full-directory upload occurs.

### Phase 3 — diagnostics and evidence analysis
Deliver named read-only probes for binary metadata, VDF/plugin declarations, dependencies, folder layout, and log signatures; versioned known-good manifests; evidence-linked findings.

Acceptance: fixtures distinguish healthy, missing, corrupted, and incompatible examples; reports separate confirmed faults from hypotheses; evidence supports reproducible root-cause analysis.

### Phase 4 — GitHub fix production
Deliver documented branch/commit workflow; CI build/test; ZIP packaging with correct game-relative paths; install/rollback guide; hash manifest and GitHub Release asset.

Acceptance: release asset exists and downloads; every packaged file matches manifest hash; archive structure and destination paths are checked; build/test results link to source commit; shared link is verified.

### Phase 5 — post-install verification
Deliver new scan tasks comparing the installation with expected fixed manifest; before/after report comparison; statuses verified/partially verified/unchanged/regressed/unable to verify; follow-up diagnostics.

Acceptance: known fault is diagnosed, a fix package is built and hash-verified, manual installation in a test installation is followed by a scan confirming expected files/config; claim game launch success only with actual launch/gameplay evidence.

### Phase 6 — scanner packaging and maintenance
Deliver installer for scanner only, scanner upgrade/uninstall, health status, logs, configuration backup, CI releases, changelog, reproducible build instructions.

Acceptance: clean install/upgrade/uninstall tested; scanner release and hash published; updates preserve credentials/config; scanner remains read-only against game files.

## 9. First implementation milestone

Build the smallest working vertical slice:
1. Create .NET 8 solution and task/report schemas.
2. Implement authenticated GitHub polling and heartbeat.
3. Implement read-only inventory of configured CSS v34 folder.
4. Calculate SHA-256 and collect basic EXE/DLL metadata.
5. Publish JSON and Markdown reports to the originating GitHub task.
6. Add CI build/tests and publish Windows x64 scanner artifact.

Do not implement patch downloading or game-folder modification. After a real scan works, implement evidence-based diagnosis and GitHub fix packaging.

## 10. Known environment and project constraints

- Game path: `C:\\Games\\Counter-Strike Source v34`.
- Source changes, CI, and distributable fixes are managed through GitHub.
- No Python for this project.
- User manually installs GitHub fixes; the bridge never installs them.
- Do not ask the user to inspect folders or copy logs if the scanner can safely collect the same evidence.
- Do not depend on SourceMod; it was rejected in the recent project direction. Native engine plugin investigation is separate.
- Earlier investigation found `plugin_print` reported no loaded plugins; engine commands include `plugin_load`, `plugin_unload`, and `plugin_print`, and engine supports `addons/*.vdf`. This is a diagnostic lead, not proof of DLL compatibility.
- A prior SDK foundation did not contain the actual CS:S DLL, SDK, or bot integration. Do not confuse an engine-independent C++ core with a working in-game mod.
- The current CSS Bot Community repository is early development. Its experimental SourceMod bridge is not this Local CSS Bridge.

## 11. Definition of done

The system is working only when:
- This chat creates a GitHub scan task and receives a result from the local Windows agent.
- The agent safely inspects the actual CSS v34 folder and publishes useful evidence without modifying it.
- ChatGPT identifies a real fault from that evidence.
- ChatGPT implements a fix in GitHub, builds/tests it, and publishes a verified downloadable package.
- The user manually installs the package using precise instructions.
- A new scan confirms whether expected files/configuration are present and correct.
- The inspect -> diagnose -> develop -> package -> download -> manual install -> rescan cycle is repeatable and documented.

Use exact statuses: “protocol drafted”, “agent builds”, “GitHub connection tested”, “read-only scan tested”, “diagnosis validated”, “CI build passed”, “package created”, “asset verified”, “user installed”, “post-install scan passed”, “game launch tested”. Never say “fully connected” or “fixed” prematurely.
