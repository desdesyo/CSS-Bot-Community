export function adaptiveScale(p95, current, isMobile = false) {
  const target = isMobile ? 33.3 : 16.7;
  const min = isMobile ? 0.86 : 0.82;
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
export const TEAM_SPAWNS = Object.freeze({
  // Six compact, mirrored landing positions. CT deploys beside the bombsite;
  // T deploys at the far end of the district and must cross the map.
  T: Object.freeze([[-6,-35],[-3,-37],[0,-35],[3,-37],[6,-35],[0,-40]]),
  CT: Object.freeze([[-6,31],[-3,33],[0,31],[3,33],[6,31],[0,36]])
});
export const BOMB_SITE = Object.freeze({x:0,z:23});
export function createTeamRoster(playerTeam = 'CT') {
  if (playerTeam !== 'CT' && playerTeam !== 'T') throw new Error('playerTeam must be CT or T');
  // The player occupies the sixth slot of their faction's landing formation.
  // "enemy"/"ally" remain relative to the player for combat logic.
  const enemyTeam = playerTeam === 'CT' ? 'T' : 'CT';
  const enemy = TEAM_SPAWNS[enemyTeam].map(([x,z],i)=>[i+1,'enemy',x,z]);
  const ally = TEAM_SPAWNS[playerTeam].slice(0,5).map(([x,z],i)=>[i+7,'ally',x,z]);
  return [...enemy,...ally];
}


/** Aim assist prefers the closest enemy near the crosshair, not a farther target
 * that happens to be a fraction of a degree more centered. */
export function aimCandidateScore(angleRadians, distance) {
  if (!Number.isFinite(angleRadians) || !Number.isFinite(distance) || angleRadians < 0 || distance < 0) return Infinity;
  return angleRadians + distance * 0.0045;
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


/** A* navigation over the arena's static AABB collision map. */
export function findPathAStar(start, target, colliders = [], radius = 0.42, cellSize = 1.5) {
  const minX=-53,minZ=-42,maxX=53,maxZ=42;
  const width=Math.ceil((maxX-minX)/cellSize),height=Math.ceil((maxZ-minZ)/cellSize);
  const toCell=p=>({x:Math.max(0,Math.min(width-1,Math.round((p.x-minX)/cellSize))),z:Math.max(0,Math.min(height-1,Math.round((p.z-minZ)/cellSize)))});
  const toWorld=c=>({x:minX+c.x*cellSize,z:minZ+c.z*cellSize});
  const key=(x,z)=>x+","+z,startCell=toCell(start),goal=toCell(target);
  const blocked=(x,z)=>{
    if(x<0||z<0||x>=width||z>=height)return true;
    const p=toWorld({x,z});
    for(const b of colliders){
      if(b.maxY<=0.04||b.minY>=1.68)continue;
      const nx=Math.max(b.minX,Math.min(p.x,b.maxX)),nz=Math.max(b.minZ,Math.min(p.z,b.maxZ));
      const dx=p.x-nx,dz=p.z-nz;
      if(dx*dx+dz*dz<(radius+0.10)*(radius+0.10))return true;
    }
    return false;
  };
  const startKey=key(startCell.x,startCell.z),goalKey=key(goal.x,goal.z);
  if(startKey===goalKey)return [target];
  const open=[{...startCell,g:0,f:Math.hypot(goal.x-startCell.x,goal.z-startCell.z)}];
  const came=new Map(),cost=new Map([[startKey,0]]),closed=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let found=false,iterations=0;
  while(open.length&&iterations++<5000){
    open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur.x,cur.z);
    if(closed.has(ck))continue;
    if(ck===goalKey){found=true;break}
    closed.add(ck);
    for(const [dx,dz] of dirs){
      const x=cur.x+dx,z=cur.z+dz,k=key(x,z);
      if(closed.has(k)||blocked(x,z))continue;
      if(dx&&dz&&(blocked(cur.x+dx,cur.z)||blocked(cur.x,cur.z+dz)))continue;
      const ng=cur.g+(dx&&dz?1.4142:1);
      if(ng>=(cost.get(k)??Infinity))continue;
      cost.set(k,ng);came.set(k,ck);
      open.push({x,z,g:ng,f:ng+Math.hypot(goal.x-x,goal.z-z)});
    }
  }
  if(!found)return [target];
  const result=[];let k=goalKey;
  while(k!==startKey&&came.has(k)){
    const [x,z]=k.split(",").map(Number);result.push(toWorld({x,z}));k=came.get(k);
  }
  result.reverse();result.push(target);
  const smooth=[];
  for(let i=0;i<result.length;i++){
    if(i===0||i===result.length-1){smooth.push(result[i]);continue}
    const a=smooth[smooth.length-1],b=result[i],c=result[i+1];
    const abx=b.x-a.x,abz=b.z-a.z,bcx=c.x-b.x,bcz=c.z-b.z;
    if(Math.abs(abx*bcz-abz*bcx)>0.08)smooth.push(b);
  }
  return smooth;
}
