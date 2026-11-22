// The simulation: the player, the guards and their suspicion, the relics and
// the exit. Everything moves in fixed steps; the renderer only paints what
// is here, and the loop only drains the event flags for sounds and screens.

import { FIELD, PLAYER, GUARD, DETECTION, PEBBLES_PER_LEVEL, LIVES } from './config.js';
import { LEVELS } from './levels.js';
import { hasLineOfSight, angleDifference } from './vision.js';

export const EVENT_PICKUP = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WIN = 16;
export const EVENT_GAMEOVER = 32;
export const EVENT_PEBBLE = 64;
export const EVENT_DOOR = 128;
export const EVENT_STEP_GUARD = 256;
export const EVENT_STEP_PLAYER = 512;

/** Push a circle out of a rectangle it overlaps, along one axis only. */
function pushOutAxis(circle, rect, axis, radius) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  if (dx * dx + dy * dy >= radius * radius) return;
  if (axis === 'x') {
    circle.x = circle.x < rect.x + rect.w / 2 ? rect.x - radius : rect.x + rect.w + radius;
  } else {
    circle.y = circle.y < rect.y + rect.h / 2 ? rect.y - radius : rect.y + rect.h + radius;
  }
}

/** Move a circle by (dx, dy), sliding along walls and cover. */
function moveCircle(circle, dx, dy, solids, radius) {
  circle.x += dx;
  for (const rect of solids) pushOutAxis(circle, rect, 'x', radius);
  circle.y += dy;
  for (const rect of solids) pushOutAxis(circle, rect, 'y', radius);
  circle.x = Math.max(radius, Math.min(FIELD.width - radius, circle.x));
  circle.y = Math.max(radius, Math.min(FIELD.height - radius, circle.y));
}

function pointInRects(x, y, rects) {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function pointInLamp(x, y, lamps) {
  for (const lamp of lamps) {
    if (Math.hypot(x - lamp.x, y - lamp.y) < lamp.r) return true;
  }
  return false;
}

function circleHitsRect(circle, rect, radius) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function createWorld(random) {
  let state = null;
  let events = 0;

  function queue(flag) {
    events |= flag;
  }

  function buildGuard(def) {
    if (def.kind === 'camera') {
      return {
        def,
        kind: 'camera',
        x: def.at[0],
        y: def.at[1],
        angle: def.sweep.center,
        state: 'patrol',
        suspicion: 0,
        sweepTime: random() * def.sweep.period,
        lastSeen: null,
        lastStep: null,
      };
    }
    const [sx, sy] = def.waypoints[0];
    const [nx, ny] = def.waypoints[1 % def.waypoints.length];
    return {
      def,
      kind: 'guard',
      x: sx,
      y: sy,
      angle: Math.atan2(ny - sy, nx - sx),
      state: 'patrol',
      suspicion: 0,
      waypointIndex: 1 % def.waypoints.length,
      pauseTimer: 0,
      lookTimer: 0,
      target: null,
      lastSeen: null,
      stepAcc: 0,
      lastStep: null,
      scanAngle: 0,
    };
  }

  function reset(levelIndex, lives = LIVES) {
    const level = LEVELS[levelIndex];
    state = {
      levelIndex,
      level,
      time: 0,
      // A fresh game starts the clock at zero; moving to the next wing keeps it.
      totalTime: levelIndex === 0 ? 0 : state ? state.totalTime : 0,
      player: {
        x: level.player.x,
        y: level.player.y,
        angle: -Math.PI / 2,
        moving: false,
        sneaking: false,
        stepAcc: 0,
        caughtTimer: 0,
      },
      guards: level.guards.map((def) => buildGuard(def)),
      relics: level.relics.map((r) => ({ x: r.x, y: r.y, taken: false })),
      relicsTaken: 0,
      pebbles: [],
      pebbleCount: PEBBLES_PER_LEVEL,
      lives,
      alarm: false,
      alarmTimer: 0,
      everSuspicious: false,
      everAlarmed: false,
      levelDone: false,
      gameDone: false,
      gameOver: false,
      rating: null,
      exitOpen: false,
    };
    return state;
  }

  /** The blockers for sight and movement: walls plus tall cover. */
  function solids(level) {
    return [...level.walls, ...level.cover];
  }

  function rateFor(guard, player, level) {
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const range = guard.def.sightRange ?? GUARD.sightRange;
    if (dist > range) return { visible: false, dist };
    const angleTo = Math.atan2(dy, dx);
    if (angleDifference(angleTo, guard.angle) > GUARD.sightHalfAngle) return { visible: false, dist };
    if (!hasLineOfSight(guard.x, guard.y, player.x, player.y, solids(level))) {
      return { visible: false, dist };
    }
    let rate = DETECTION.baseRate * (1 - 0.55 * (dist / range));
    if (pointInLamp(player.x, player.y, level.lamps)) rate *= DETECTION.litMultiplier;
    if (pointInRects(player.x, player.y, level.shadows)) rate *= DETECTION.shadowMultiplier;
    if (player.sneaking) rate *= DETECTION.sneakMultiplier;
    else if (!player.moving) rate *= DETECTION.stillMultiplier;
    return { visible: true, dist, rate };
  }

  function triggerAlarm() {
    if (state.alarm) return;
    state.alarm = true;
    state.everAlarmed = true;
    state.alarmTimer = GUARD.alarmStandDown;
    queue(EVENT_ALARM);
    for (const guard of state.guards) {
      if (guard.kind === 'guard' && guard.state !== 'chase') {
        guard.state = 'chase';
        guard.target = { x: state.player.x, y: state.player.y };
      }
    }
  }

  function stepGuard(guard, dt) {
    const level = state.level;
    const player = state.player;

    // Cameras sweep; guards walk. Either way, first check what they can see.
    if (guard.kind === 'camera') {
      guard.sweepTime += dt;
      const s = guard.def.sweep;
      guard.angle = s.center + s.amp * Math.sin((2 * Math.PI * guard.sweepTime) / s.period);
    }
    const seen = rateFor(guard, player, level);
    if (seen.visible) {
      guard.suspicion = Math.min(100, guard.suspicion + seen.rate * dt);
      guard.lastSeen = { x: player.x, y: player.y };
      if (guard.suspicion >= DETECTION.suspiciousAt) state.everSuspicious = true;
      if (guard.suspicion >= DETECTION.alarmAt) triggerAlarm();
    } else {
      let decay = DETECTION.decayRate;
      if (pointInRects(player.x, player.y, level.shadows)) decay += DETECTION.shadowDecayBonus;
      guard.suspicion = Math.max(0, guard.suspicion - decay * dt);
    }

    if (guard.kind === 'camera') return; // cameras never move

    function walkToward(tx, ty, speed) {
      const dx = tx - guard.x;
      const dy = ty - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) return true;
      const step = Math.min(dist, speed * dt);
      const nx = guard.x + (dx / dist) * step;
      const ny = guard.y + (dy / dist) * step;
      const before = { x: guard.x, y: guard.y };
      moveCircle(guard, nx - guard.x, ny - guard.y, solids(level), GUARD.radius);
      const movedAngle = Math.atan2(guard.y - before.y, guard.x - before.x);
      if (movedAngle) guard.angle = movedAngle;
      guard.stepAcc += Math.hypot(guard.x - before.x, guard.y - before.y);
      if (guard.stepAcc >= GUARD.stepEvery) {
        guard.stepAcc -= GUARD.stepEvery;
        guard.lastStep = { x: guard.x, y: guard.y, t: 0 };
        queue(EVENT_STEP_GUARD);
      }
      return Math.hypot(tx - guard.x, ty - guard.y) < 4;
    }

    if (state.alarm) {
      guard.state = 'chase';
      walkToward(player.x, player.y, GUARD.chaseSpeed);
      return;
    }

    if (guard.state === 'chase') {
      // The alarm stood down while this guard was chasing: head home.
      guard.state = 'return';
      guard.target = null;
    }
    if (guard.suspicion >= DETECTION.investigateAt && guard.state !== 'investigate') {
      guard.state = 'investigate';
      guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    } else if (guard.suspicion >= DETECTION.suspiciousAt && guard.state === 'patrol') {
      guard.state = 'suspicious';
      guard.lookTimer = 1.2;
    }

    if (guard.state === 'suspicious') {
      if (guard.lastSeen) {
        guard.angle = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      }
      guard.lookTimer -= dt;
      if (guard.lookTimer <= 0) {
        if (guard.suspicion >= DETECTION.suspiciousAt) {
          guard.state = 'investigate';
          guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
        } else {
          guard.state = 'patrol';
        }
      }
      return;
    }
    if (guard.state === 'investigate') {
      const target = guard.target ?? { x: guard.x, y: guard.y };
      if (walkToward(target.x, target.y, GUARD.investigateSpeed)) {
        guard.lookTimer = GUARD.investigateLook;
        guard.state = 'investigateLook';
      }
      return;
    }
    if (guard.state === 'investigateLook') {
      guard.lookTimer -= dt;
      guard.angle += dt * 1.4;
      if (guard.lookTimer <= 0) {
        guard.state = 'return';
        guard.target = null;
      }
      return;
    }
    if (guard.state === 'return') {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < guard.def.waypoints.length; i += 1) {
        const [wx, wy] = guard.def.waypoints[i];
        const d = Math.hypot(wx - guard.x, wy - guard.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      const [wx, wy] = guard.def.waypoints[best];
      if (walkToward(wx, wy, GUARD.patrolSpeed)) {
        guard.waypointIndex = (best + 1) % guard.def.waypoints.length;
        guard.state = 'patrol';
        guard.pauseTimer = 0;
      }
      return;
    }
    // Patrol: walk the loop, pausing and looking around at each waypoint.
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.scanAngle += dt * 0.9;
      guard.angle += Math.sin(guard.scanAngle) * dt * 0.8;
      return;
    }
    const [wx, wy] = guard.def.waypoints[guard.waypointIndex];
    if (walkToward(wx, wy, GUARD.patrolSpeed)) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.def.waypoints.length;
      guard.pauseTimer = GUARD.waypointPause;
      guard.scanAngle = 0;
    }
  }

  function step(dt, move, sneaking, pebblePoint) {
    if (!state || state.levelDone || state.gameDone || state.gameOver) return 0;
    const level = state.level;
    const player = state.player;
    events = 0;

    if (player.caughtTimer > 0) {
      player.caughtTimer -= dt;
      return events;
    }
    state.time += dt;

    // The alarm stands down after a few seconds with nobody in sight.
    if (state.alarm) {
      const anyoneSees = state.guards.some((g) => rateFor(g, player, level).visible);
      if (anyoneSees) state.alarmTimer = GUARD.alarmStandDown;
      else state.alarmTimer -= dt;
      if (state.alarmTimer <= 0) {
        state.alarm = false;
        for (const guard of state.guards) {
          if (guard.kind === 'guard' && guard.state === 'chase') {
            guard.state = 'return';
            guard.suspicion = Math.max(guard.suspicion, 50);
          }
        }
      }
    }

    // Pebble: a click lands a stone that rings out and draws guards over.
    if (pebblePoint && state.pebbleCount > 0) {
      state.pebbleCount -= 1;
      state.pebbles.push({ x: pebblePoint.x, y: pebblePoint.y, t: 0 });
      queue(EVENT_PEBBLE);
      for (const guard of state.guards) {
        if (guard.kind !== 'guard') continue;
        const dist = Math.hypot(guard.x - pebblePoint.x, guard.y - pebblePoint.y);
        if (dist < GUARD.hearingRange && guard.state !== 'chase') {
          guard.state = 'investigate';
          guard.target = { x: pebblePoint.x, y: pebblePoint.y };
          guard.suspicion = Math.max(guard.suspicion, 40);
        }
      }
    }
    for (const pebble of state.pebbles) pebble.t += dt;
    state.pebbles = state.pebbles.filter((p) => p.t < 1.2);

    // Player movement: sneak is slow and silent, walking is faster and audible.
    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    player.sneaking = sneaking;
    player.moving = move.x !== 0 || move.y !== 0;
    if (player.moving) {
      const before = { x: player.x, y: player.y };
      moveCircle(player, move.x * speed * dt, move.y * speed * dt, solids(level), PLAYER.radius);
      const movedAngle = Math.atan2(player.y - before.y, player.x - before.x);
      if (movedAngle) player.angle = movedAngle;
      if (!sneaking) {
        player.stepAcc += Math.hypot(player.x - before.x, player.y - before.y);
        if (player.stepAcc >= GUARD.stepEvery) {
          player.stepAcc -= GUARD.stepEvery;
          queue(EVENT_STEP_PLAYER);
          for (const guard of state.guards) {
            if (guard.kind !== 'guard' || guard.state === 'chase') continue;
            const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
            if (dist < 90) guard.suspicion = Math.min(100, guard.suspicion + 12);
          }
        }
      }
    }

    for (const guard of state.guards) stepGuard(guard, dt);
    for (const guard of state.guards) {
      if (guard.lastStep) guard.lastStep.t += dt;
    }

    // Relics: walk over one to pocket it.
    for (const relic of state.relics) {
      if (!relic.taken && Math.hypot(player.x - relic.x, player.y - relic.y) < 30) {
        relic.taken = true;
        state.relicsTaken += 1;
        queue(EVENT_PICKUP);
        if (state.relicsTaken === state.relics.length) {
          state.exitOpen = true;
          queue(EVENT_DOOR);
        }
      }
    }

    // Caught: a chasing guard lays hands on the thief.
    if (state.alarm) {
      for (const guard of state.guards) {
        if (guard.kind !== 'guard') continue;
        const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
        if (dist < GUARD.radius + PLAYER.radius - 2) {
          state.lives -= 1;
          queue(EVENT_CAUGHT);
          if (state.lives <= 0) {
            state.gameOver = true;
            queue(EVENT_GAMEOVER);
          } else {
            player.x = level.player.x;
            player.y = level.player.y;
            player.caughtTimer = PLAYER.caughtFreeze;
            state.alarm = false;
            for (const g of state.guards) {
              const fresh = buildGuard(g.def);
              Object.assign(g, fresh);
            }
          }
          break;
        }
      }
    }

    // Exit: only when every relic is pocketed.
    if (state.exitOpen && circleHitsRect(player, level.exit, PLAYER.radius)) {
      state.levelDone = true;
      state.totalTime += state.time;
      state.rating = !state.everAlarmed && !state.everSuspicious
        ? 'GHOST'
        : !state.everAlarmed
          ? 'SHADOW'
          : 'SEEN';
      queue(EVENT_LEVEL);
      if (state.levelIndex >= LEVELS.length - 1) {
        state.gameDone = true;
        queue(EVENT_WIN);
      }
    }
    return events;
  }

  function advance() {
    if (state.levelIndex + 1 < LEVELS.length) reset(state.levelIndex + 1, state.lives);
  }

  reset(0);

  return {
    get state() {
      return state;
    },
    reset,
    step,
    advance,
    /** The highest suspicion among guards and cameras, for the HUD heat bar. */
    heat() {
      if (!state) return 0;
      return Math.max(0, ...state.guards.map((g) => g.suspicion));
    },
    /** True when the player stands in a shadow patch (HUD hint). */
    playerInShadow() {
      if (!state) return false;
      return pointInRects(state.player.x, state.player.y, state.level.shadows);
    },
    /** True when the player stands in a lamp pool (HUD hint). */
    playerInLight() {
      if (!state) return false;
      return pointInLamp(state.player.x, state.player.y, state.level.lamps);
    },
  };
}
