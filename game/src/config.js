// Velvet Shadow — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  /** Seconds a caught player is frozen before the level restarts. */
  caughtFreeze: 1.2,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 68,
  investigateSpeed: 118,
  chaseSpeed: 232,
  /** Seconds a guard waits at each patrol waypoint, looking around. */
  waypointPause: 1.6,
  /** Seconds a guard looks around at an investigation point before giving up. */
  investigateLook: 2.4,
  /** How far a guard can see, in pixels. */
  sightRange: 250,
  /** Half-angle of a guard's vision cone, in radians. */
  sightHalfAngle: 0.62,
  /** Seconds of no sight before the alarm stands down. */
  alarmStandDown: 4,
  /** How far a pebble's noise carries, in pixels. */
  hearingRange: 300,
  /** Footstep ripple: one step every this many pixels walked. */
  stepEvery: 46,
};

export const DETECTION = {
  /** Suspicion per second at point blank, in full light, player walking. */
  baseRate: 95,
  /** Multiplier while the player stands in a lit lamp pool. */
  litMultiplier: 1.5,
  /** Multiplier while the player stands in a shadow patch. */
  shadowMultiplier: 0.35,
  /** Multiplier while sneaking. */
  sneakMultiplier: 0.5,
  /** Multiplier while standing still. */
  stillMultiplier: 0.75,
  /** Suspicion per second lost while unseen. */
  decayRate: 26,
  /** Extra decay per second while unseen and standing in shadow. */
  shadowDecayBonus: 22,
  /** Suspicion at which a guard stops and stares ("?"). */
  suspiciousAt: 30,
  /** Suspicion at which a guard walks to investigate. */
  investigateAt: 70,
  /** Suspicion at which the alarm trips. */
  alarmAt: 100,
};

export const PEBBLES_PER_LEVEL = 3;

export const LIVES = 3;

export const PALETTE = {
  backdrop: '#0b0e1a',
  floorA: '#262b4d',
  floorB: '#21264a',
  floorLine: '#2c3157',
  rug: '#3a2b4d',
  shadowPatch: '#141a33',
  wall: '#4a4560',
  wallTop: '#6b6486',
  wallEdge: '#2e2a40',
  crate: '#7a5c38',
  crateEdge: '#543d24',
  crateTop: '#9a7648',
  statue: '#8d8fa8',
  statueEdge: '#5d5f78',
  lampGlow: '#ffd27a',
  lampPool: '#ffe9b0',
  relic: '#7ff0d4',
  relicGlow: '#2ee6a8',
  exit: '#58e07a',
  exitGlow: '#1d9e4b',
  player: '#c9b8ff',
  playerCloak: '#6f5bd0',
  guard: '#e8b34b',
  guardUniform: '#3f6db3',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneSuspect: 'rgba(255, 176, 66, 0.34)',
  coneAlarm: 'rgba(255, 77, 77, 0.38)',
  coneEdge: 'rgba(255, 220, 130, 0.55)',
  text: '#f2ead8',
  muted: '#9a94b8',
  panel: '#171a2e',
  panelEdge: '#33395e',
  danger: '#ff5d5d',
  gold: '#ffd27a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best (fastest) clear time is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-shadow.best-ms';
