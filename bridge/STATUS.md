# Implementation status

## Implemented

- Protocol schemas and a Windows .NET 8 x64 console agent.
- GitHub Issues polling over outbound HTTPS; scans up to 1,000 open issues and only accepts the explicit `Local CSS Bridge Task:` title prefix.
- Fine-grained GitHub token stored with Windows DPAPI CurrentUser.
- Read-only recursive inventory with SHA-256 hashes, file sizes, timestamps, and EXE/DLL file version metadata.
- PE inspection: machine architecture, subsystem, DLL flag, imported library names, export count, and up to 256 exported symbol names.
- Bounded config/log text analysis (maximum 1 MiB read per candidate file); reports line, error, warning, key/value, and basic brace/quote-balance counters only; never uploads text contents.
- Previous-complete-scan manifest comparison with added/removed/changed SHA-256 paths; first observation is explicitly not treated as a known-good game manifest.
- Bounded file count, hash size, pending directory queue, and streamed directory enumeration.
- JSON scan report posted as a comment on the originating task issue; no game file contents uploaded.
- Windows x64 self-contained single-file publish and ZIP packaging in GitHub Actions.
- Removed obsolete SourceMod bridge and legacy PowerShell repair utility.

## CI verification

- Latest relevant run: [run #9 — Publish self-contained single-file Windows scanner](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/43564559238).
- Result: **success**. Windows x64 Publish, ZIP packaging, and artifact upload all completed successfully.
- Artifact: `LocalCssBridge-win-x64`, SHA-256 `dc84f438bf4a868a4747721307259222fe336f48e8758377b3d339e890ee6912`.
- CI does not prove the agent has run on the user's PC.

## Pending verification and later phases

- First real scan of the user's Windows installation. Task is waiting in issue #2.
- Cross-machine duplicate-worker claim/lease coordination (a local per-account file lock is implemented).
- Validate PE and text analyzers in the latest Windows CI run; extend text parsers for specific Source engine formats after inspecting actual sample files.
- Trusted expected-manifest comparison against a known-clean CS:S v34 reference and evidence-based repair package generation.
- Post-install comparison using the implemented previous-scan snapshot; stronger verification against a trusted clean reference remains pending.
- Real-game launch testing after a repair is prepared and manually installed.

The current deliverable is a CI-built read-only scanner, not an autonomous repair system. No claim is made that the game has been repaired or launched successfully.
