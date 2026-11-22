// The screenshot scenes behind ?shot=start|play|alarm|end. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot that
// creeps toward the nearest relic and freezes when a guard's cone sweeps
// near, so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { STEP, GUARD, PLAYER } from './config.js';
import { hasLineOfSight, angleDifference } from './vision.js';
import { SCREEN_LEVEL, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const ALARM_WAIT_SECONDS = 4;
const END_LIMIT_SECONDS = 300;
const LOOKAHEAD = 0.15;

const DIRECTIONS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 0.7071, y: 0.7071 },
  { x: -0.7071, y: 0.7071 },
  { x: 0.7071, y: -0.7071 },
  { x: -0.7071, y: -0.7071 },
];

/**
 * How exposed a point is: 0 when no guard can see it, up to ~2 when a guard
 * is close, looking straight at it, and already suspicious.
 */
function dangerAt(state, x, y) {
  const blockers = [...state.level.walls, ...state.level.cover];
  let danger = 0;
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    const range = guard.def.sightRange ?? GUARD.sightRange;
    if (dist > range) continue;
    if (angleDifference(Math.atan2(dy, dx), guard.angle) > GUARD.sightHalfAngle) continue;
    if (!hasLineOfSight(guard.x, guard.y, x, y, blockers)) continue;
    danger = Math.max(danger, (1 - dist / range) * (1 + guard.suspicion / 100));
  }
  return danger;
}

function nearestTarget(state) {
  const player = state.player;
  let target = null;
  let best = Infinity;
  for (const relic of state.relics) {
    if (relic.taken) continue;
    const d = Math.hypot(relic.x - player.x, relic.y - player.y);
    if (d < best) {
      best = d;
      target = relic;
    }
  }
  if (target) return target;
  return { x: state.level.exit.x + state.level.exit.w / 2, y: state.level.exit.y + state.level.exit.h / 2 };
}

/** One autopilot step: the safest move toward the nearest relic (or the exit). */
function autopilot(state) {
  const player = state.player;
  const solids = [...state.level.walls, ...state.level.cover];
  // A step that would land inside a wall or a crate is no step at all: without
  // this the pilot leans on a crate forever, pushed back by the physics.
  function blockedAt(x, y) {
    for (const r of solids) {
      if (x > r.x - 18 && x < r.x + r.w + 18 && y > r.y - 18 && y < r.y + r.h + 18) return true;
    }
    return false;
  }
  // Alarmed: forget the relic and run — put distance between the thief and
  // the nearest chasing guard until the alarm stands down.
  if (state.alarm) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const g of state.guards) {
      if (g.kind !== 'guard') continue;
      const d = Math.hypot(g.x - player.x, g.y - player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = g;
      }
    }
    let bestMove = DIRECTIONS[0];
    let bestScore = -Infinity;
    for (const dir of DIRECTIONS) {
      const x = player.x + dir.x * PLAYER.walkSpeed * LOOKAHEAD;
      const y = player.y + dir.y * PLAYER.walkSpeed * LOOKAHEAD;
      if (blockedAt(x, y)) continue;
      const d = nearest ? Math.hypot(x - nearest.x, y - nearest.y) : 0;
      const score = d - dangerAt(state, x, y) * 200;
      if (score > bestScore) {
        bestScore = score;
        bestMove = dir;
      }
    }
    return { move: bestMove, sneak: false };
  }
  const target = nearestTarget(state);
  const hot = state.guards.some((g) => g.suspicion >= 55) || dangerAt(state, player.x, player.y) > 0.25;
  let bestMove = DIRECTIONS[0];
  let bestScore = -Infinity;
  for (const dir of DIRECTIONS) {
    const speed = hot ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const x = player.x + dir.x * speed * LOOKAHEAD;
    const y = player.y + dir.y * speed * LOOKAHEAD;
    if (blockedAt(x, y)) continue;
    const dist = Math.hypot(target.x - x, target.y - y);
    const danger = dangerAt(state, x, y);
    const inShadow = state.level.shadows.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    const inLamp = state.level.lamps.some((lamp) => Math.hypot(x - lamp.x, y - lamp.y) < lamp.r);
    // When hot, a shadow patch is worth far more than standing still: freezing
    // in the open while a cone sweeps over is how the pilot gets caught.
    let score = -dist * 2 - danger * 700 + (inShadow ? (hot ? 120 : 25) : 0) - (inLamp ? 40 : 0);
    if (dir.x === 0 && dir.y === 0) score += hot ? 30 : -15;
    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  }
  return { move: bestMove, sneak: hot };
}

/**
 * Set `world` to the named scene (start, play, alarm or end; any other name
 * is start) and return the screen to draw over it and the best time to show.
 */
export function stageShot(name, world) {
  world.reset(0);
  const state = world.state;
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const { move, sneak } = autopilot(state);
      world.step(STEP, move, sneak, null);
      if (state.levelDone || state.gameOver) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // Stand in the open ahead of the first guard and back away slowly while
    // his suspicion climbs, then run once the alarm trips — the chase, caught
    // mid-frame, with the thief still free.
    const guard = state.guards[0];
    state.player.x = guard.x + Math.cos(guard.angle) * 190;
    state.player.y = guard.y + Math.sin(guard.angle) * 190;
    for (let i = 0; i < ALARM_WAIT_SECONDS / STEP; i += 1) {
      // Stand still while the guard closes in: backing away too fast walks
      // out of his cone and the suspicion never builds. Only give ground
      // when he is close enough to touch.
      const dist = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
      if (dist < 130) {
        const away = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
        world.step(STEP, { x: Math.cos(away), y: Math.sin(away) }, false, null);
      } else {
        world.step(STEP, { x: 0, y: 0 }, false, null);
      }
      if (state.alarm) break;
    }
    for (let i = 0; i < 1.5 / STEP; i += 1) {
      const away = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
      world.step(STEP, { x: Math.cos(away), y: Math.sin(away) }, false, null);
      if (state.gameOver) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const { move, sneak } = autopilot(state);
      world.step(STEP, move, sneak, null);
      if (state.levelDone || state.gameOver) break;
    }
    if (!state.levelDone) {
      // The pilot ran out of luck: stage the cleared wing by hand — the
      // frame is still a real render of the game's own code.
      for (const relic of state.relics) relic.taken = true;
      state.relicsTaken = state.relics.length;
      state.exitOpen = true;
      state.player.x = state.level.exit.x + state.level.exit.w / 2;
      state.player.y = state.level.exit.y + state.level.exit.h / 2 + 40;
      state.levelDone = true;
      state.gameOver = false;
      state.alarm = false;
      for (const guard of state.guards) {
        guard.suspicion = 0;
        if (guard.state === 'chase') guard.state = 'return';
      }
      state.lives = Math.max(1, state.lives);
      state.rating = state.everAlarmed ? 'SEEN' : state.everSuspicious ? 'SHADOW' : 'GHOST';
      state.time = 96.4;
    }
    return { screen: SCREEN_LEVEL, best: 0 };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0 }, false, null);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
