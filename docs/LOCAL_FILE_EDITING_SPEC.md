# SOLO.Chat → CSS Overhaul local file workflow

## Purpose

Connect the existing SOLO.Chat agent workspace to the existing CSS Overhaul sources and the user's Counter-Strike: Source v34 installation. This extends the current projects; it does not create a new chat or a new mod.

## Existing project identities

- SOLO.Chat / source and Worker: desdesyo/CSS-Bot-Community, branch github-chat-prototype.
- Mod workspace: desdesyo/modhaul, branch main.
- Game install: C:\Games\Counter-Strike Source v34.
- Candidate local Overhaul compiled folder: C:\Users\Aleksey\Desktop\overhaul\compiled\ (previously discussed, not yet verified by the paired PC).
- Authoritative portable gameplay/SDK foundation is CSS-Bot-Community branch sdk-foundation: src/CSSBC_*.cpp/.h, sdk/server/CSSBC_BotRuntime.*, sdk/server/CSSBC_SDKBridge.h and sdk/dll/CSSBC_V34Bridge.*. Continue from this branch for mechanics work.
- Existing modhaul repository contains cssbc.smx, a minimal native Metamod bootstrap source, PCBridge and recovery tooling. The repository tree currently does not establish that the original SourcePawn source for cssbc.smx is present. The current main tree contains no .sp/.inc SourcePawn sources; do not assume cssbc.smx can be rebuilt. Its engine DLL copies are not verified pristine references.
- The sdk-foundation branch has BotRuntime::OnWeaponShot() and an ABI contract, but no actual CCSBot/GameDLL event hook or verified matching v34 SDK integration. The portable C++ core is not yet proof of an engine-integrated CS:S v34 plugin. Verify actual hooks, SDK ABI, compiler architecture and runtime integration before claiming a mechanic works. Existing Nov 2026 Game Protector reports repeatedly show C0000005 at engine.dll offset 0x001B824A with ECX=0, but no symbols prove the root cause or implicate CSSBC. The recovery tooling documents that no verified pristine reference set is available.

## What exists now

1. SOLO.Chat's durable agent can read/create/update UTF-8 text files in the configured GitHub workspace and create auditable commits.
2. User uploads and generated artifacts have authenticated storage endpoints in the chat runtime.
3. The computer-bridge companion pairs through a single-use code and polls outbound over HTTPS.
4. The companion can inspect system information, list configured folders and read selected text/config/source files.
5. A narrow computer_write_text_file agent tool and local write_text_file companion action are implemented in source. They accept allowlisted text/source extensions only, limit writes to 256 KiB, require an exact expected SHA-256 (or NEW for creation), make and verify a backup, display the old/new hashes, require the user to type APPLY in the local console, atomically replace the file and verify the resulting SHA-256. A hash-only audit record is kept locally.
6. A computer_install_smx tool and install_smx companion action are implemented in source. They download only from approved GitHub HTTPS hosts, accept only .smx files under cstrike/addons/sourcemod/plugins/, verify the package hash and current-file precondition, back up the existing plugin, require local APPLY, atomically replace and verify the installed hash. The package size is capped at 10 MB. A read-only hash_file action returns size and SHA-256 without uploading binary contents, so the agent can safely establish the current plugin precondition.
6. The independent LocalCssBridge C# scanner remains read-only and continues to collect game manifests, hashes and PE/config diagnostics.

Both local write/install operations are not yet verified on the user's PC. The text writer cannot write binary files; the separate .smx installer supports only a single SourceMod plugin in the exact plugins folder. Native .dll/.exe and core engine file deployment remain unsupported.

## Mandatory workflow for every Overhaul mechanic

1. Recover context: read project instructions, prior task summaries, existing issues, commits, modhaul files, CSSBC source and previous diagnostic evidence. Do not ask the user to repeat known paths or decisions.
2. Inspect the target: use the paired computer agent to list and read relevant source/config files and compute their SHA-256. If the device is not paired, report that exact connection blocker; do not pretend local files were inspected.
3. Trace the mechanic: identify source definitions, call sites, hooks, event flow, configuration, dependencies and actual engine entry points. Mark design-only or disconnected code explicitly.
4. Edit the authoritative source: prefer desdesyo/modhaul for existing Overhaul source and desdesyo/CSS-Bot-Community for shared CSSBC core/agent infrastructure. Use focused commits and tests.
5. Build for the actual target: verify the exact CS:S v34 engine ABI, x86 architecture, SDK branch, SourceMod/Metamod versions and compiler. Do not use a modern x64 binary for a legacy x86 game.
6. Create a release package: include only necessary files, exact relative destination paths, source commit, toolchain details, SHA-256 manifest, compatibility note, backup/rollback guide and a versioned artifact.
7. Apply text/config edits: first read the current local file and SHA-256; queue computer_write_text_file with that exact hash; wait for the local agent result. The user approves the precise change by typing APPLY on the paired Windows machine. Never say it was applied while the task is queued or declined.
8. Apply a compiled .smx plugin only through computer_install_smx, with a GitHub-hosted immutable source, package SHA-256, exact current-file hash, allowed SourceMod plugins destination, local backup and APPLY confirmation. The text writer must never be used for binary data. Native .dll/.exe installation remains unsupported until v34 ABI compatibility is proven.
9. Verify installation: run a new local read-only scan and compare installed hashes to the package manifest.
10. Verify behavior: test on the exact game build. CI compilation is not a substitute for loading the plugin and exercising the mechanic in-game.
11. Report evidence: cite exact repository commit, workflow run, artifact, local task result, before/after hashes and any outstanding in-game test.

## Write safety rules

- Only configured allowlisted roots are writable. Add the Overhaul source folder only after the companion confirms that it exists.
- No UNC paths, traversal, symlink/reparse-point escapes, or implicit directory creation.
- No shell, PowerShell, command execution, process launch or arbitrary URL download from chat tasks.
- Never overwrite core engine files such as server.dll, client.dll, engine.dll, tier0.dll, vstdlib.dll, FileSystem_Steam.dll or vphysics.dll through the text writer.
- No write without exact precondition hash, verified backup and local interactive approval.
- A failed post-write hash check triggers rollback where a verified backup exists and must be reported as failure.
- Every local write produces a local audit entry containing task ID, target, before/after hashes, backup path and status; never store file contents or credentials in the audit log.

## Remaining implementation milestones

- Add unit/integration tests for path traversal, symlinks, extension allowlist, hash mismatch, create-only semantics, backup integrity, atomic replace, rollback and unattended refusal.
- Pair and exercise the companion on the user's actual Windows machine; confirm the configured game root and inspect whether the candidate Overhaul source folder exists.
- Add a full multi-file package installer with immutable manifest, rollback across partial failures and post-install scan. The current .smx installer handles one file per task.
- Add native .dll installation only after the matching v34 ABI/toolchain and a real compatibility test are established. Core engine DLL replacement remains prohibited by default.
- Restore or locate authoritative SourcePawn source for the existing cssbc.smx, if available, before editing/recompiling that plugin.
- Trace and integrate the portable CSSBC C++ core into actual CS:S runtime hooks; do not equate standalone unit tests with in-game behavior.
