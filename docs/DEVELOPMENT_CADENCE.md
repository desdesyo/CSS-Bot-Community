# Short development cycles and playable verification

This is a mandatory project rule for SOLO Engine and CSSBC.

## Non-negotiable rule

A new build or feature must not remain in development for a long, undefined period while producing nothing playable. Work is delivered in small, independently testable increments. The player must always have a known last stable build, and every development cycle must produce an observable result.

## Maximum cycle

- Target one small development cycle: **1–3 calendar days**.
- No feature may spend more than **3 days without a runnable increment**.
- If a feature cannot be completed in that window, split it into a smaller vertical slice. Deliver the first working part and keep the remainder as separate tasks.
- Never hold unrelated finished fixes until a large milestone is complete.
- Do not publish a deadline as achieved unless the corresponding build and test evidence exist.

These are engineering limits for task slicing, not a promise that an external service, deployment or user test will happen automatically.

## Required execution sequence

Every task follows this exact sequence:

1. **Concrete defect or feature:** describe the exact problem and expected observable behaviour.
2. **Acceptance steps:** write short, reproducible steps that determine pass/fail.
3. **Implementation:** change the smallest relevant code path; avoid unrelated rewrites.
4. **Automated verification:** run syntax/build/unit/integration tests relevant to the change.
5. **Playable verification:** launch the build and exercise the feature in a real game session or a clearly identified local prototype. For cross-play, test both Android and PC clients against the same server.
6. **Release candidate:** publish a versioned, runnable artifact or URL, with controls and known limitations.
7. **Player confirmation:** where hardware or real network access is required, provide exact steps for the user to verify. Mark this as pending until the user confirms.

## Required completion report

Every completed task reports:
- **Changed:** exact files/systems changed.
- **Result:** what can now be seen or done.
- **Tests:** commands and actual pass/fail results.
- **In-game check:** exact steps and whether performed by CI, locally, or by the player.
- **Build:** exact version/artifact/URL, or explicitly state that no runnable release exists.
- **Remaining:** only specific blockers and next step.

A commit, design document, successful compilation, or green unit test alone is not proof that a gameplay feature works in-game. Never label documentation-only work or an untested prototype as a finished game feature.

## Stable build protection

- Keep the last accepted stable release available during development.
- Development builds use a separate branch and test environment.
- Promote only after automated tests and the relevant playable acceptance checks pass.
- Preserve the previous stable release for rollback.
- If the development build fails, do not overwrite or disable the stable build.

## Cross-platform acceptance

For a feature affecting Android and PC, test the same game version and ruleset on both:
- Android browser: touch controls and reconnect.
- PC browser: keyboard/mouse and gamepad where supported.
- Both clients in one session: same player count, match state and round outcome.
- Disconnect/reconnect and version mismatch behaviour.
- No claim of public internet cross-play until a public WSS server and HTTPS client are actually deployed and tested.
