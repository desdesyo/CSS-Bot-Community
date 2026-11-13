# Weapon-specific spray model

The engine-independent recoil layer is in `src/CSSBC_Spray.h/.cpp`.

- Each weapon has its own 30-shot pitch/yaw curve, kick multiplier, horizontal scale, recovery, movement/crouch spread and burst-reset window.
- `FireSpray` returns accumulated pitch/yaw offset and spread multiplier; `RecoverSpray` handles recoil recovery and burst reset; `ResetSpray` clears state on weapon switch/death.
- Bot skill scales recoil by a bounded factor (0.65–1.35), so agents do not all compensate identically.
- Profiles currently cover AK-12, M4 SOPMOD, AUG A3, SG 553, FAMAS G2, Galil ACE, MP5, APC-9, MAC-10 and AWP AX.

This is a gameplay recoil-pattern approximation, not measured firearm telemetry. The core output still needs to be applied to Source SDK weapon/player aim in the live server integration; the repository currently has no complete weapon firing hook. Core tests cover deterministic shot progression, per-weapon differences and burst reset.
