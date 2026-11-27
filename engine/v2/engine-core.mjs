export function adaptiveScale(p95, current, isMobile = false) {
  const target = isMobile ? 40 : 16.7;
  const min = isMobile ? 0.5 : 0.78;
  const max = isMobile ? 0.8 : 1.35;
  if (!Number.isFinite(p95) || p95 <= 0) return Math.max(min, Math.min(max, current));
  if (p95 > target * 1.18) return Math.max(min, current - (isMobile ? 0.08 : 0.06));
  if (p95 < target * 0.78) return Math.min(max, current + (isMobile ? 0.015 : 0.025));
  return Math.max(min, Math.min(max, current));
}
export function moveToward(position, target, speed, dt) {
  const dx = target.x - position.x, dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return { x: position.x, z: position.z, arrived: true };
  const step = Math.min(distance, Math.max(0, speed) * Math.max(0, dt));
  return { x: position.x + dx / distance * step, z: position.z + dz / distance * step, arrived: distance <= step };
}
