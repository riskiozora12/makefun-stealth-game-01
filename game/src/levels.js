// The three wings of the Marlowe Museum. Every level is plain data: walls and
// cover block movement and sight, shadow patches slow detection, lamp pools
// speed it up, guards walk their waypoints in straight lines (so every leg
// between two waypoints is kept clear of walls and cover), and the exit only
// opens once every relic is taken.

function borderWalls() {
  return [
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 696, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 720 },
    { x: 1256, y: 0, w: 24, h: 720 },
  ];
}

export const LEVELS = [
  {
    name: 'The Marble Hall',
    hint: 'Learn the patrols. Slip past the guards, take all three relics, then reach the green door.',
    player: { x: 80, y: 630 },
    exit: { x: 1252, y: 300, w: 28, h: 64 },
    walls: [
      ...borderWalls(),
      { x: 420, y: 180, w: 420, h: 24 },
      { x: 900, y: 420, w: 24, h: 276 },
      { x: 180, y: 480, w: 300, h: 24 },
    ],
    cover: [
      { x: 560, y: 280, w: 44, h: 44, kind: 'crate' },
      { x: 604, y: 280, w: 44, h: 44, kind: 'crate' },
      { x: 340, y: 600, w: 44, h: 44, kind: 'crate' },
      { x: 1020, y: 160, w: 36, h: 36, kind: 'statue' },
      { x: 520, y: 420, w: 36, h: 36, kind: 'statue' },
    ],
    shadows: [
      { x: 60, y: 240, w: 170, h: 110 },
      { x: 980, y: 420, w: 200, h: 120 },
      { x: 560, y: 560, w: 190, h: 100 },
    ],
    lamps: [
      { x: 640, y: 120, r: 90 },
      { x: 1140, y: 620, r: 90 },
      { x: 300, y: 640, r: 80 },
    ],
    relics: [
      { x: 130, y: 110 },
      { x: 620, y: 330 },
      { x: 1140, y: 630 },
    ],
    guards: [
      {
        name: 'Hall Guard',
        waypoints: [
          [200, 110],
          [1080, 110],
          [1080, 300],
          [200, 300],
        ],
      },
      {
        name: 'Cellar Guard',
        waypoints: [
          [120, 560],
          [760, 560],
          [760, 380],
          [120, 380],
        ],
      },
    ],
  },
  {
    name: 'The Jade Gallery',
    hint: 'A camera watches the hall from above — its cone sweeps, so time your crossing. Pebbles (click) draw guards away.',
    player: { x: 80, y: 650 },
    exit: { x: 1252, y: 320, w: 28, h: 64 },
    walls: [
      ...borderWalls(),
      { x: 300, y: 170, w: 440, h: 24 },
      { x: 800, y: 170, w: 200, h: 24 },
      { x: 200, y: 400, w: 24, h: 296 },
      { x: 640, y: 430, w: 360, h: 24 },
      { x: 1080, y: 300, w: 24, h: 240 },
    ],
    cover: [
      { x: 480, y: 260, w: 44, h: 44, kind: 'crate' },
      { x: 524, y: 260, w: 44, h: 44, kind: 'crate' },
      { x: 820, y: 240, w: 36, h: 36, kind: 'statue' },
      { x: 420, y: 600, w: 44, h: 44, kind: 'crate' },
      { x: 760, y: 560, w: 36, h: 36, kind: 'statue' },
      { x: 1140, y: 340, w: 44, h: 44, kind: 'crate' },
    ],
    shadows: [
      { x: 60, y: 300, w: 150, h: 110 },
      { x: 700, y: 250, w: 170, h: 100 },
      { x: 300, y: 560, w: 180, h: 100 },
      { x: 1080, y: 120, w: 140, h: 100 },
    ],
    lamps: [
      { x: 500, y: 90, r: 90 },
      { x: 900, y: 90, r: 90 },
      { x: 1200, y: 360, r: 85 },
      { x: 400, y: 660, r: 85 },
    ],
    relics: [
      { x: 120, y: 90 },
      { x: 860, y: 330 },
      { x: 1140, y: 650 },
    ],
    guards: [
      {
        name: 'Gallery Guard',
        waypoints: [
          [160, 100],
          [1140, 100],
          [1140, 280],
          [160, 280],
        ],
      },
      {
        name: 'Vault Guard',
        waypoints: [
          [320, 340],
          [600, 340],
          [600, 520],
          [320, 520],
        ],
      },
      {
        name: 'East Guard',
        waypoints: [
          [1120, 600],
          [1240, 600],
          [1240, 460],
          [1120, 460],
        ],
      },
      {
        name: 'Hall Camera',
        kind: 'camera',
        at: [640, 44],
        sweep: { center: Math.PI / 2, amp: 0.7, period: 5 },
        sightRange: 300,
      },
    ],
  },
  {
    name: 'The Vault of Stars',
    hint: 'Four guards, two cameras, and long dark halls. Move only when the cones look away — and never run in the light.',
    player: { x: 80, y: 650 },
    exit: { x: 1252, y: 340, w: 28, h: 64 },
    walls: [
      ...borderWalls(),
      { x: 240, y: 150, w: 420, h: 24 },
      { x: 760, y: 150, w: 280, h: 24 },
      { x: 420, y: 330, w: 24, h: 366 },
      { x: 700, y: 330, w: 360, h: 24 },
      { x: 1080, y: 460, w: 24, h: 236 },
      { x: 180, y: 560, w: 200, h: 24 },
    ],
    cover: [
      { x: 520, y: 300, w: 44, h: 44, kind: 'crate' },
      { x: 564, y: 300, w: 44, h: 44, kind: 'crate' },
      { x: 900, y: 270, w: 36, h: 36, kind: 'statue' },
      { x: 520, y: 420, w: 44, h: 44, kind: 'crate' },
      { x: 860, y: 480, w: 36, h: 36, kind: 'statue' },
      { x: 120, y: 300, w: 44, h: 44, kind: 'crate' },
      { x: 1160, y: 380, w: 36, h: 36, kind: 'statue' },
    ],
    shadows: [
      { x: 60, y: 280, w: 150, h: 110 },
      { x: 480, y: 480, w: 170, h: 110 },
      { x: 900, y: 120, w: 150, h: 90 },
      { x: 1140, y: 520, w: 120, h: 120 },
      { x: 240, y: 620, w: 160, h: 80 },
    ],
    lamps: [
      { x: 400, y: 90, r: 90 },
      { x: 700, y: 250, r: 85 },
      { x: 1150, y: 120, r: 85 },
      { x: 600, y: 640, r: 90 },
      { x: 1230, y: 400, r: 80 },
    ],
    relics: [
      { x: 110, y: 80 },
      { x: 640, y: 240 },
      { x: 1180, y: 650 },
    ],
    guards: [
      {
        name: 'Star Guard',
        waypoints: [
          [150, 90],
          [1150, 90],
          [1150, 250],
          [150, 250],
        ],
      },
      {
        name: 'West Guard',
        waypoints: [
          [100, 420],
          [340, 420],
          [340, 500],
          [100, 500],
        ],
      },
      {
        name: 'Vault Guard',
        waypoints: [
          [780, 420],
          [1020, 420],
          [1020, 600],
          [780, 600],
        ],
      },
      {
        name: 'South Guard',
        waypoints: [
          [1120, 560],
          [1230, 560],
          [1230, 660],
          [1120, 660],
        ],
      },
      {
        name: 'North Camera',
        kind: 'camera',
        at: [300, 44],
        sweep: { center: Math.PI / 2, amp: 0.6, period: 5 },
        sightRange: 280,
      },
      {
        name: 'South Camera',
        kind: 'camera',
        at: [980, 676],
        sweep: { center: -Math.PI / 2, amp: 0.6, period: 6 },
        sightRange: 280,
      },
    ],
  },
];
