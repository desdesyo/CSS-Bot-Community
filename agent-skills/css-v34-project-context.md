# CSS Bot Community / Counter-Strike: Source v34 — project context

Load this skill before every task involving CSSBC, the CS:S v34 mod, SourceMod, the GameDLL, bots, installer, SDK, or the user's local game. For inspecting or repairing the installed game's files, also load `css-v34-file-forensics.md`.

## Canonical workspaces

| Purpose | Repository | Branch |
|---|---|---|
| Authoritative CSSBC portable core + native CS:S v34 integration | `desdesyo/CSS-Bot-Community` | `sdk-foundation` |
| CSSBC staging / earlier plugin artifacts | `desdesyo/modhaul` | `main` |
| SOLO.Chat application | `desdesyo/CSS-Bot-Community` | `github-chat-prototype` |

The user's game root is `C:\Games\Counter-Strike Source v34`. Never ask for it again. These workspaces are not interchangeable.

## Verified build state

- Latest verified Win32 build workflow: [Build CSSBC native modules (Win32)](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/43487000595)
- Source commit: `e76ad4a7dcbc08e125aa73092596cc875b8cccc2`.
- All three jobs passed: `build-vsp`, `build-v34-gamedll`, `build-installer`.
- The workflow compiled a Win32 VSP DLL, a CSSBC-integrated CS:S v34 GameDLL (`server.dll`), and a `CSSBC_Setup.exe` installer. It also published the updater bundle.
- This is build/packaging evidence only. The artifacts have not been confirmed installed or tested in the user's game. Never report in-game success from CI alone.

## Native GameDLL integration

- `tools/integrate-v34-gamedll.ps1` checks out a pinned CS:S v34 source tree, copies CSSBC core and adapter sources, injects `cssbc::sdk::OnBotUpdate(this)` into `CCSBot::Update`, and adds CSSBC translation units to `server_cstrike.vpc`.
- Pinned game source: `sl1mshady-cs/cssv34-client`, commit `55f860bf42a537ac55aaef684f6fa0effee714a8`.
- Pinned AlliedModders CS:S SDK headers: commit `47f0ea659bc70718f9c41a7830b6ad943a68ba09`.
- The first native behavior targets existing CS:S bots with retreat / seek-cover decisions. The portable core includes tactics, bot brain, economy, team memory, combat, MVP, awards, support roster, systems and UI models.
- Read `README.md`, `docs/START_HERE_V34.md`, `docs/FIRST_V34_PROTOTYPE_TEST.md`, `sdk/server/CSSBC_EngineAdapter.cpp`, `sdk/server/CSSBC_BotRuntime.*`, and the integration script before changing the integration.

## Optional SourceMod prototype — not the target architecture

- The optional plugin source exists at `sourcemod/scripting/cssbc.sp`; the README is `sourcemod/README.md`.
- Commands: `sm_cssbc`, `sm_support 1|2|3`, `sm_juggernaut`.
- Tier 3 currently announces a support squad order; it does not spawn NPCs. Juggernaut currently sets health and a round state; it does not implement six hitbox-linked armor plates.
- The native GameDLL/VSP build is the main project direction. Do not confuse this optional SourceMod experiment with the native integration.

## modhaul staging workspace

The current `desdesyo/modhaul@main` tree contains `cssbc.smx` and `native/CSSBC_Native.cpp`. It is not the full source workspace. The SourcePawn prototype in `sdk-foundation/sourcemod/scripting/cssbc.sp` exists, but do not claim it is proven to be the exact source used to build the older modhaul binary unless provenance/build evidence establishes that.

## Installer layout and safety

The installer targets:
- GameDLL: `cstrike\\bin\\server.dll`
- VSP: `cstrike\\addons\\cssbc\\bin\\CSSBC_VSP.dll`
- VSP manifest: `cstrike\\addons\\cssbc.vdf`

The installer creates `server.dll.cssbc-backup` before replacing the original. Never install into the user's working game without the paired Windows companion, verified backup and local APPLY approval. Prefer a separate test copy for the first in-game test.

## Known gaps and evidence discipline

- The first native test plan is in `docs/FIRST_V34_PROTOTYPE_TEST.md`. It requires ordinary game startup, stock bot spawn/movement/combat, death, round end, map change and clean shutdown, with logs compared.
- The portable test documented in `docs/PORTABLE_V34_PLUGIN_TEST.md` found that the engine exposes `plugin_load` / `plugin_print` commands, but `plugin_print` returned an empty plugin list. That does not prove arbitrary plugin loading.
- The optional SourceMod prototype does not yet implement support NPC spawning, six armor plates, final HUD/VGUI, or full bot navigation.
- Older `docs/SDK_INTEGRATION.md` and `docs/ARCHITECTURE.md` contain pre-integration statements that no SDK/GameDLL integration exists. Those sections are stale relative to the current README, integration script and successful build workflow. Update them when touching those docs; do not use them to deny the verified build.
- A successful build does not prove compatibility with every v34 distribution or actual gameplay. Verify exact paths, x86 ABI, active GameDLL, backup, installation result and in-game behavior.

## Required workflow

1. Read the current branch's `AGENTS.md`, README, START_HERE and FIRST_V34 checklist.
2. Inspect the exact source, call sites, integration script, latest build logs and artifact manifest.
3. Make focused source changes on the correct branch.
4. Run Core CI and the Win32 native build. Preserve build artifacts and exact SHA.
5. Use the paired Windows companion for local inspection/install only after hash and backup checks. Poll its result until write/installation is verified.
6. Run an actual in-game test on a separate copy. Capture sanitized logs and record pass/fail for each acceptance step.
7. Never claim completion based solely on a plan, code commit, passing portable tests or a successful compile.

The user explicitly does not want Python for this project. Use GitHub Actions, PowerShell and existing C++/SourcePawn toolchains.
