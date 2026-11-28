/**
 * Partition axis-aligned ground rectangles into non-overlapping cells.
 * Used to build one asphalt mesh and cut sidewalk meshes around road crossings.
 */
export function partitionSurfaceRects(rectangles = [], cutouts = []) {
  const valid = list => (list || []).filter(r =>
    Number.isFinite(r.x) && Number.isFinite(r.z) &&
    Number.isFinite(r.w) && Number.isFinite(r.d) && r.w > 0 && r.d > 0
  );
  const rects = valid(rectangles), holes = valid(cutouts);
  if (!rects.length) return [];
  const all = [...rects, ...holes];
  const xs = [...new Set(all.flatMap(r => [r.x-r.w/2, r.x+r.w/2]))].sort((a,b)=>a-b);
  const zs = [...new Set(all.flatMap(r => [r.z-r.d/2, r.z+r.d/2]))].sort((a,b)=>a-b);
  const contains = (r,x,z) =>
    x > r.x-r.w/2-1e-8 && x < r.x+r.w/2+1e-8 &&
    z > r.z-r.d/2-1e-8 && z < r.z+r.d/2+1e-8;
  const cells = [];
  for (let xi=0; xi<xs.length-1; xi++) for (let zi=0; zi<zs.length-1; zi++) {
    const x0=xs[xi], x1=xs[xi+1], z0=zs[zi], z1=zs[zi+1];
    if (x1-x0<1e-7 || z1-z0<1e-7) continue;
    const cx=(x0+x1)/2, cz=(z0+z1)/2;
    const covering=rects.filter(r=>contains(r,cx,cz));
    if (!covering.length || holes.some(r=>contains(r,cx,cz))) continue;
    cells.push({x0,x1,z0,z1,y:Math.max(...covering.map(r=>Number.isFinite(r.y)?r.y:0))});
  }
  return cells;
}
