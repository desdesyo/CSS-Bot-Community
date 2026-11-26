# Stable playable builds

## Goal

Development must never make the last playable build unavailable or unstable. The project uses two delivery channels:

- **Stable**: the latest tested, tagged playable release. This is what players launch.
- **Development**: ongoing work on the `develop` branch. It may be incomplete and must never replace Stable automatically.

## Branch rules

- `main` is the stable integration branch. Only tested, reviewed milestones are merged into it.
- `develop` is the active development branch.
- Feature work happens on short-lived `feature/*` branches and merges into `develop`.
- A release candidate is tested separately. Only after acceptance does it merge into `main` and receive a version tag such as `v0.1.0`.
- Never force-push or rewrite the published stable history.
- A failed development build must not alter or delete a published release.

## Player experience

The eventual public play page must always point to the latest stable release, never to the live development branch. Stable builds are immutable and versioned. Keep the previous stable release available as rollback.

The in-game or launcher UI should show:
- Installed stable version.
- Whether a newer stable version exists.
- Optional development preview, clearly marked experimental and opt-in.
- A one-click return to the last stable version where browser storage/platform constraints allow.

For the browser game, publish each stable build to a versioned directory and publish a small stable manifest that points to the current version. Upload to a temporary staging location first, smoke-test it, then switch the stable manifest. Never overwrite the active stable build while staging a new one.

## Quality gates

A candidate cannot be called playable until it passes:
1. Automated build and unit tests.
2. Android browser launch test.
3. Touch movement and aiming test.
4. Gamepad connection, input mapping, disconnect/reconnect test.
5. Map load and collision test.
6. Weapon firing/reload/damage test.
7. Save/settings persistence test.
8. 10-minute continuous play smoke test without a blocking crash.

Every release includes a version number, changelog, known issues, controls guide and tested-device notes.

## Current honest status

The repository currently contains an engine-independent C++ CSSBC gameplay core and specifications. It does not yet contain a complete playable game, Android browser runtime, or stable downloadable build. Therefore there is no existing playable version to pin or launch today. This policy ensures that once the first playable milestone exists, later development cannot silently replace it.
