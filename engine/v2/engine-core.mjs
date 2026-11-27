export function adaptiveScale(p95, current, isMobile = false) {
  const target = isMobile ? 33.3 : 16.7;
  const min = isMobile ? 0.72 : 0.78;
  const max = isMobile ? 1.0 : 1.35;
  if (!Number.isFinite(p95) || p95 <= 0) return Math.max(min, Math.min(max, current));
  if (p95 > target * 1.18) return Math.max(min, current - 0.06);
  if (p95 < target * 0.78) return Math.min(max, current + 0.025);
  return Math.max(min, Math.min(max, current));
}
export function moveToward(position, target, speed, dt) {
  const dx = target.x - position.x, dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return { x: position.x, z: position.z, arrived: true };
  const step = Math.min(distance, Math.max(0, speed) * Math.max(0, dt));
  return { x: position.x + dx / distance * step, z: position.z + dz / distance * step, arrived: distance <= step };
}
export function createTeamRoster(playerTeam = 'CT') {
  if (playerTeam !== 'CT' && playerTeam !== 'T') throw new Error('playerTeam must be CT or T');
  // "enemy"/"ally" are relative to the human player, not CT/T faction names.
  return [
    [1,'enemy',-36,-30],[2,'enemy',36,-30],[3,'enemy',-44,8],
    [4,'enemy',44,8],[5,'enemy',-18,-35],[6,'enemy',18,-35],
    [7,'ally',-18,35],[8,'ally',18,35],[9,'ally',-42,0],
    [10,'ally',42,0],[11,'ally',0,30]
  ];
}

export function cameraRelativeMovement(yaw, forward, strafe) {
  return {
    x: Math.sin(yaw) * forward + Math.cos(yaw) * strafe,
    z: Math.cos(yaw) * forward - Math.sin(yaw) * strafe
  };
}


/** Swept circular player-vs-AABB collision with axis sliding. */
export function moveWithAabbCollisions(position, movement, colliders = [], radius = 0.36, playerHeight = 1.72, maxStep = 0.10) {
  const dx = Number.isFinite(movement.x) ? movement.x : 0;
  const dz = Number.isFinite(movement.z) ? movement.z : 0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(0.02, maxStep)));
  const stepX = dx / steps, stepZ = dz / steps;
  let x = position.x, z = position.z, blockedX = false, blockedZ = false;
  const blockedBy = new Set();
  const collides = (px, pz) => {
    for (const box of colliders) {
      if (box.maxY <= position.y - playerHeight + 0.04 || box.minY >= position.y - 0.04) continue;
      const nearestX = Math.max(box.minX, Math.min(px, box.maxX));
      const nearestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
      const ox = px - nearestX, oz = pz - nearestZ;
      if (ox * ox + oz * oz < radius * radius) {
        blockedBy.add(box.name || 'unnamed-collider');
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < steps; i++) {
    const nextX = x + stepX;
    if (!collides(nextX, z)) x = nextX;
    else blockedX = true;
    const nextZ = z + stepZ;
    if (!collides(x, nextZ)) z = nextZ;
    else blockedZ = true;
  }
  return { x, z, blockedX, blockedZ, blockedBy: [...blockedBy] };
}


/** Select the first spawn point that does not overlap a standing player's collision circle. */
export function findSafePlayerSpawn(candidates, colliders = [], radius = 0.36, playerHeight = 1.72, footY = 0) {
  const clear = (point) => {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) return false;
    for (const box of colliders) {
      if (box.maxY <= footY + 0.04 || box.minY >= footY + playerHeight - 0.04) continue;
      const nx = Math.max(box.minX, Math.min(point.x, box.maxX));
      const nz = Math.max(box.minZ, Math.min(point.z, box.maxZ));
      const dx = point.x - nx, dz = point.z - nz;
      if (dx * dx + dz * dz < radius * radius) return false;
    }
    return true;
  };
  for (const point of candidates || []) if (clear(point)) return { x: point.x, z: point.z };
  return null;
}
