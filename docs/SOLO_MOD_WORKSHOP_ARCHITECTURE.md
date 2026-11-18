# SOLO MOD WORKSHOP — architecture and first milestone

## Product definition

SOLO.Chat is first a local-first mod production workshop. It must be useful when every cloud AI provider is unavailable. Advanced AI is an optional planning and reasoning layer, not the runtime on which file creation, packaging, inspection or deterministic build steps depend.

## Production lanes

| Lane | Local-first output | Initial approach |
|---|---|---|
| Code | SourceMod plugins, scripts, configs, source files | Text editor/tooling, compiler when installed |
| 3D | Models, rigs, animations, exports | Blender project files and Blender Python automation |
| Visuals | Icons, UI, textures, materials | Reproducible image/texture tools; optional local image model |
| Audio | SFX, ambience, music | Audacity/FFmpeg and local synthesis; preserve source + exported files |
| Video | Demonstration clips and previews | FFmpeg/editor workflows; heavy generation is optional and hardware-dependent |
| Build & QA | Packages, manifests, hashes, test reports | Deterministic local scripts and explicit validation |

Local means no metered AI API call; it does not mean zero CPU/GPU/storage cost. Heavy image/video models may not be practical on low-spec computers and must never be silently required.

## Architecture boundaries

1. **SOLO Mod Workspace** — owns source, assets, project metadata, build output and tests.
2. **Local Computer Bridge** — outbound HTTPS task transport and narrowly scoped file operations. It is not a remote shell.
3. **Local Tool Adapters** — explicit adapters for compilers, Blender, image/audio/video tools. Each adapter reports tool version, command arguments, exit code and output paths. No arbitrary command execution through chat.
4. **Artifact/QA layer** — inventories outputs, hashes files, validates expected formats and records evidence.
5. **Advanced AI** — optional planner/reviewer that creates typed tasks for the above layers. It cannot claim a build or install succeeded without returned evidence.
6. **Cloud quota** — applies only to explicitly enabled cloud AI calls. Local file operations, hashes and local builds do not consume it.

## First milestone delivered by this change

- A Windows PowerShell workspace initializer creates a predictable project tree and .solo/project.json.
- A bounded inventory script records relative paths, sizes, timestamps and SHA-256 for files up to a configurable size. It excludes build output, dependency folders, Git metadata and its own .solo metadata.
- The initializer records the CS:S v34 game path as a target but does not access or alter the game installation.
- Existing bridge/ read-only scanner and computer-bridge/ approval-gated text/SourceMod-plugin writer remain separate components. This change does not claim they have been run on the user's PC.

## Acceptance criteria for the next milestones

### M1 — workspace and evidence
- [x] Create local workspace structure and project manifest.
- [x] Generate bounded local SHA-256 inventory.
- [ ] Run both scripts on the user's Windows PC and inspect returned inventory.

### M2 — production adapters
- [ ] Detect installed compiler/tool versions without assuming they exist.
- [ ] Build a SourceMod plugin from source and capture compiler output.
- [ ] Add Blender batch adapter for scripted model/scene generation and export.
- [ ] Add image, audio and video conversion adapters with explicit format/size limits.

### M3 — safe delivery
- [ ] Generate a package manifest and reproducible archive.
- [ ] Compare package against target-game requirements.
- [ ] Install only through a separate allowlisted, backup-first, user-approved operation.
- [ ] Launch/test in a real CS:S v34 environment and attach logs/evidence.

### M4 — optional Advanced AI
- [ ] Planner emits typed tasks, never shell strings.
- [ ] Implementer uses only registered adapters and permitted file operations.
- [ ] Independent tester validates artifacts and reports failures.
- [ ] Global weighted budget applies only to cloud AI usage, with an isolated emergency reserve.

## Safety invariants

- Never write to the game directory during workspace initialization or inventory.
- Never execute arbitrary task text as PowerShell, shell or JavaScript.
- Keep generated files inside configured project roots.
- Require an exact expected hash, backup and local confirmation for destructive/replacement operations.
- Treat missing evidence as NOT VERIFIED, never PASS.
