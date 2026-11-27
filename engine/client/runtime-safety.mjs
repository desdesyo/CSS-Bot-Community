export function clampAxis(value) {
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
}

export function applyDeadzone(value, deadzone = 0.18) {
  const v = clampAxis(value);
  const threshold = Math.max(0, Math.min(0.95, deadzone));
  const magnitude = Math.abs(v);
  if (magnitude <= threshold) return 0;
  return Math.sign(v) * Math.min(1, (magnitude - threshold) / (1 - threshold));
}

export function chooseConnectedGamepad(pads, activeIndex = null) {
  const list = Array.from(pads || []);
  const active = activeIndex === null ? null : list[activeIndex];
  if (active?.connected) return { gamepad: active, index: active.index };
  const fallback = list.find(pad => pad?.connected) || null;
  return { gamepad: fallback, index: fallback ? fallback.index : null };
}

export function isGamepadButtonPressed(gamepad, index) {
  return !!gamepad?.buttons?.[index]?.pressed;
}
