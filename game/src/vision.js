// Sight geometry: whether a straight line between two points is blocked by walls
// or tall cover, and the polygon of a vision cone clipped by those blockers.
// Everything here works on plain {x, y} points and {x, y, w, h} rectangles.

/** True when the segment from (x1,y1) to (x2,y2) touches rectangle r. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  // Slab test on each axis: shrink the [tMin, tMax] interval the segment spends
  // inside the rectangle; empty means no hit.
  for (const [origin, delta, lo, hi] of [
    [x1, dx, r.x, r.x + r.w],
    [y1, dy, r.y, r.y + r.h],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < lo || origin > hi) return false;
    } else {
      let t0 = (lo - origin) / delta;
      let t1 = (hi - origin) / delta;
      if (t0 > t1) {
        const tmp = t0;
        t0 = t1;
        t1 = tmp;
      }
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

/** True when nothing in `blockers` (rectangles) stands between a and b. */
export function hasLineOfSight(ax, ay, bx, by, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(ax, ay, bx, by, blockers[i])) return false;
  }
  return true;
}

/**
 * Distance from (ox,oy) along a unit ray (dx,dy) to the nearest blocker edge,
 * capped at maxDist. Returns maxDist when the ray reaches nothing.
 */
export function rayDistance(ox, oy, dx, dy, blockers, maxDist) {
  let best = maxDist;
  for (let i = 0; i < blockers.length; i += 1) {
    const r = blockers[i];
    // Ray against the rectangle's four edges, via the slab interval.
    let tMin = 0;
    let tMax = best;
    let hit = true;
    for (const [origin, delta, lo, hi] of [
      [ox, dx, r.x, r.x + r.w],
      [oy, dy, r.y, r.y + r.h],
    ]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < lo || origin > hi) {
          hit = false;
          break;
        }
      } else {
        let t0 = (lo - origin) / delta;
        let t1 = (hi - origin) / delta;
        if (t0 > t1) {
          const tmp = t0;
          t0 = t1;
          t1 = tmp;
        }
        tMin = Math.max(tMin, t0);
        tMax = Math.min(tMax, t1);
        if (tMin > tMax) {
          hit = false;
          break;
        }
      }
    }
    if (hit && tMin < best) best = tMin;
  }
  return best;
}

/**
 * The polygon of a vision cone from (x,y) facing `angle`, half-angle `half`
 * and reach `range`, clipped by blockers. Returns an array of points starting
 * at the origin, so it can be filled directly. Extra rays are cast at the
 * corners of blockers inside the cone so the shadow edge follows the walls.
 */
export function conePolygon(x, y, angle, half, range, blockers, rays = 28) {
  const points = [{ x, y }];
  const angles = [];
  for (let i = 0; i <= rays; i += 1) {
    angles.push(angle - half + (2 * half * i) / rays);
  }
  // Add a ray at every blocker corner inside the cone: the cone's edge hugs it.
  for (let i = 0; i < blockers.length; i += 1) {
    const r = blockers[i];
    for (const [cx, cy] of [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x, r.y + r.h],
      [r.x + r.w, r.y + r.h],
    ]) {
      const a = Math.atan2(cy - y, cx - x);
      let d = a - angle;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) <= half) angles.push(a);
    }
  }
  angles.sort((a, b) => a - b);
  for (const a of angles) {
    const dist = rayDistance(x, y, Math.cos(a), Math.sin(a), blockers, range);
    points.push({ x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist });
  }
  return points;
}

/** Smallest absolute angle between two headings, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}
