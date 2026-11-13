# Live weapon recoil integration contract

Each server-side bot owns a `cssbc::sdk::BotRuntime`. At the live weapon fire hook:

1. Map the active CS:S weapon classname to `cssbc::WeaponId`.
2. Call `runtime.OnWeaponShot(id, gpGlobals->curtime, bot->IsMoving(), bot->IsCrouching(), skill)`.
3. Apply the returned pitch/yaw recoil to the bot's aim controller (not to player view angles directly), and use `spread` in the weapon's bullet-direction/spread calculation.
4. Call `runtime.OnWeaponChanged()` when the active weapon changes; reset on death/round restart too.

This repository now owns recoil state per bot and exposes the shot output through BotRuntime. The final step must be implemented in the actual CS:S game DLL's weapon/CCSBot source: vanilla Source SDK does not expose a generic hook to replace server bullet spread or bot aim. This repo does not include Valve's CS:S game source, so that final engine patch cannot be built or verified here.
