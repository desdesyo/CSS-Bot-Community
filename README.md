# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source-compatible Source engine project.

> **Status:** early development. This repository currently contains an engine-independent gameplay core, not a playable CS:S DLL. Game integration requires a compatible community CS:S SDK/fork.

## Core systems
- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut.
- Juggernaut purchase: $16,000 and at least 3 dead allies.
- Six individually damageable armor plates.
- Personality traits and probabilistic callout trust.
- Evidence-weighted weak-plate selection (no omniscient knowledge).
- Retreat probability, cover reward and MVP event scoring.

## Build and test
```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for engine integration requirements.