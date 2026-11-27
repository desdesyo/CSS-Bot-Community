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
  const enemyTeam = playerTeam === 'CT' ? 'enemy' : 'ally';
  const allyTeam = playerTeam === 'CT' ? 'ally' : 'enemy';
  return [
    [1,enemyTeam,-36,-30],[2,enemyTeam,36,-30],[3,enemyTeam,-44,8],
    [4,enemyTeam,44,8],[5,enemyTeam,-18,-35],[6,enemyTeam,18,-35],
    [7,allyTeam,-18,35],[8,allyTeam,18,35],[9,allyTeam,-42,0],
    [10,allyTeam,42,0],[11,allyTeam,0,30]
  ];
}
