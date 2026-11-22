# Velvet Shadow — The Marlowe Museum

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/riskiozora12/makefun-stealth-game-01/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/riskiozora12/makefun-stealth-game-01/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game: you are Wren, the Velvet Shadow, slipping through the Marlowe Museum after midnight. Pocket all three relics in each wing, then reach the green door — unseen.

## How it plays

- **Move** with WASD or arrow keys. **Hold Shift to sneak** — slower and silent, and much harder for guards to spot.
- **Click to throw a pebble** (3 per wing): the noise draws the nearest guard away to investigate.
- **Guards patrol** their rounds with cones of sight. A cone that catches you fills their suspicion: at "?" they stop and stare, at "!" they come to look, and at full they raise the **alarm** and chase. Break line of sight for a few seconds and the alarm stands down.
- **Shadow hides you, lamplight betrays you.** Dark carpet patches slow detection; warm lamp pools speed it up. Your lantern lights only a small circle around you.
- **Footsteps tell you where a guard is**: each guard's steps ripple on the floor and tick in the sound. Your own walking steps are audible to guards nearby — sneak when they are close.
- **Three wings** — The Marble Hall, The Jade Gallery (with a sweeping security camera), and The Vault of Stars (four guards, two cameras). Clear a wing without ever being suspected for a GHOST rating.
- Sound is all synthesised with WebAudio (footsteps, chimes, alarm sting, ambient drone). **M** toggles sound, **P** pauses.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is plain static files under `game/`.

## Files

- `game/index.html` — the page; `game/src/` holds the game, one job per file: `config.js` (tuning), `levels.js` (the three wings), `vision.js` (sight and cones), `input.js`, `audio.js`, `world.js` (rules, guard AI, detection), `render.js` (drawing and screens), `shots.js` (screenshot scenes), `main.js` (boot and loop).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game's own code: the title over the hall, sneaking past a patrol, the alarm chase, and a wing cleared.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wt28nn7m&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
