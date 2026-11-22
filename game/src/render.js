// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Order matters: floor, then the vision
// cones, then the night overlay with its holes of light, then the people and
// the HUD, so the guards stay readable against the dark floor.
import { FIELD, FONT, LIVES, PALETTE, GUARD } from './config.js';
import { conePolygon } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';

const PANEL = { width: 760, top: 150, line: 32, bottom: 78 };

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const night = document.createElement('canvas');
  night.width = FIELD.width;
  night.height = FIELD.height;
  const nightCtx = night.getContext('2d');

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function drawFloor(state) {
    const level = state.level;
    context.fillStyle = PALETTE.floorA;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble tiles: alternating shades with thin grout lines.
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) {
          context.fillStyle = PALETTE.floorB;
          context.fillRect(tx * tile, ty * tile, tile, tile);
        }
        context.strokeStyle = PALETTE.floorLine;
        context.lineWidth = 1;
        context.strokeRect(tx * tile + 0.5, ty * tile + 0.5, tile, tile);
      }
    }
    // Shadow patches: dark rugs of safety, drawn as deep blue carpet.
    for (const s of level.shadows) {
      context.fillStyle = PALETTE.shadowPatch;
      context.fillRect(s.x, s.y, s.w, s.h);
      context.strokeStyle = PALETTE.rug;
      context.lineWidth = 3;
      context.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
    }
    // Lamp pools: warm circles on the floor, bright at the centre.
    for (const lamp of level.lamps) {
      const glow = context.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
      glow.addColorStop(0, 'rgba(255, 233, 176, 0.55)');
      glow.addColorStop(1, 'rgba(255, 233, 176, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      context.fill();
      circle(lamp.x, lamp.y, 5, PALETTE.lampGlow);
    }
  }

  function drawWallsAndCover(state) {
    const level = state.level;
    for (const wall of level.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 4);
      context.fillStyle = PALETTE.wallEdge;
      context.fillRect(wall.x, wall.y + wall.h - 3, wall.w, 3);
    }
    for (const c of level.cover) {
      if (c.kind === 'crate') {
        context.fillStyle = PALETTE.crate;
        context.fillRect(c.x, c.y, c.w, c.h);
        context.fillStyle = PALETTE.crateTop;
        context.fillRect(c.x, c.y, c.w, 5);
        context.strokeStyle = PALETTE.crateEdge;
        context.lineWidth = 2;
        context.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(c.x + c.w, c.y + c.h);
        context.moveTo(c.x + c.w, c.y);
        context.lineTo(c.x, c.y + c.h);
        context.stroke();
      } else {
        // Statue: a pale figure on a plinth.
        context.fillStyle = PALETTE.statueEdge;
        context.fillRect(c.x - 2, c.y + c.h - 10, c.w + 4, 10);
        context.fillStyle = PALETTE.statue;
        context.beginPath();
        context.arc(c.x + c.w / 2, c.y + c.h / 2 - 2, c.w / 2 - 4, 0, Math.PI * 2);
        context.fill();
        circle(c.x + c.w / 2, c.y + c.h / 2 - 8, 5, PALETTE.statue);
      }
    }
  }

  function drawRelicsAndExit(state) {
    const level = state.level;
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 300);
    for (const relic of state.relics) {
      if (relic.taken) continue;
      // Pedestal.
      context.fillStyle = PALETTE.statueEdge;
      context.fillRect(relic.x - 12, relic.y - 6, 24, 12);
      // The relic itself: a glowing diamond.
      const glow = context.createRadialGradient(relic.x, relic.y - 14, 2, relic.x, relic.y - 14, 34 * pulse);
      glow.addColorStop(0, 'rgba(126, 240, 212, 0.8)');
      glow.addColorStop(1, 'rgba(126, 240, 212, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(relic.x, relic.y - 14, 34 * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.relic;
      context.beginPath();
      context.moveTo(relic.x, relic.y - 26);
      context.lineTo(relic.x + 9, relic.y - 14);
      context.lineTo(relic.x, relic.y - 2);
      context.lineTo(relic.x - 9, relic.y - 14);
      context.closePath();
      context.fill();
    }
    // Exit: a doorway in the wall. Locked it is a marked hatch; open it glows green.
    const exit = level.exit;
    context.fillStyle = state.exitOpen ? PALETTE.exitGlow : '#20242e';
    context.fillRect(exit.x - 4, exit.y - 4, exit.w + 8, exit.h + 8);
    context.fillStyle = state.exitOpen ? PALETTE.exit : '#0d2417';
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    if (!state.exitOpen) {
      context.strokeStyle = 'rgba(96, 224, 148, 0.55)';
      context.lineWidth = 2;
      context.strokeRect(exit.x + 2, exit.y + 2, exit.w - 4, exit.h - 4);
      context.fillStyle = 'rgba(96, 224, 148, 0.75)';
      context.beginPath();
      context.moveTo(exit.x + exit.w / 2, exit.y + exit.h / 2 - 6);
      context.lineTo(exit.x + exit.w / 2 + 6, exit.y + exit.h / 2);
      context.lineTo(exit.x + exit.w / 2, exit.y + exit.h / 2 + 6);
      context.lineTo(exit.x + exit.w / 2 - 6, exit.y + exit.h / 2);
      context.closePath();
      context.fill();
    }
    if (state.exitOpen) {
      const glow = context.createRadialGradient(
        exit.x + exit.w / 2, exit.y + exit.h / 2, 4,
        exit.x + exit.w / 2, exit.y + exit.h / 2, 70,
      );
      glow.addColorStop(0, 'rgba(88, 224, 122, 0.55)');
      glow.addColorStop(1, 'rgba(88, 224, 122, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, 70, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawCones(state) {
    const blockers = [...state.level.walls, ...state.level.cover];
    for (const guard of state.guards) {
      const range = guard.def.sightRange ?? GUARD.sightRange;
      const poly = conePolygon(guard.x, guard.y, guard.angle, GUARD.sightHalfAngle, range, blockers);
      let fill = PALETTE.coneCalm;
      if (state.alarm || guard.suspicion >= 70) fill = PALETTE.coneAlarm;
      else if (guard.suspicion >= 30) fill = PALETTE.coneSuspect;
      context.fillStyle = fill;
      context.beginPath();
      context.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) context.lineTo(poly[i].x, poly[i].y);
      context.closePath();
      context.fill();
      context.strokeStyle = PALETTE.coneEdge;
      context.lineWidth = 1;
      context.globalAlpha = 0.5;
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawNight(state) {
    // Darkness with holes: lamp pools and the thief's lantern.
    nightCtx.setTransform(1, 0, 0, 1, 0, 0);
    nightCtx.clearRect(0, 0, FIELD.width, FIELD.height);
    nightCtx.fillStyle = 'rgba(6, 8, 20, 0.42)';
    nightCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    nightCtx.globalCompositeOperation = 'destination-out';
    for (const lamp of state.level.lamps) {
      const hole = nightCtx.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, lamp.r + 40);
      hole.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      nightCtx.fillStyle = hole;
      nightCtx.beginPath();
      nightCtx.arc(lamp.x, lamp.y, lamp.r + 40, 0, Math.PI * 2);
      nightCtx.fill();
    }
    const p = state.player;
    const lantern = nightCtx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 150);
    lantern.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    lantern.addColorStop(1, 'rgba(0, 0, 0, 0)');
    nightCtx.fillStyle = lantern;
    nightCtx.beginPath();
    nightCtx.arc(p.x, p.y, 150, 0, Math.PI * 2);
    nightCtx.fill();
    if (state.exitOpen) {
      const e = state.level.exit;
      const hole = nightCtx.createRadialGradient(e.x + e.w / 2, e.y + e.h / 2, 4, e.x + e.w / 2, e.y + e.h / 2, 80);
      hole.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      nightCtx.fillStyle = hole;
      nightCtx.beginPath();
      nightCtx.arc(e.x + e.w / 2, e.y + e.h / 2, 80, 0, Math.PI * 2);
      nightCtx.fill();
    }
    nightCtx.globalCompositeOperation = 'source-over';
    context.drawImage(night, 0, 0);
  }

  function drawPebblesAndSteps(state) {
    for (const pebble of state.pebbles) {
      const radius = 12 + pebble.t * 90;
      context.strokeStyle = `rgba(255, 230, 150, ${Math.max(0, 0.9 - pebble.t)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(pebble.x, pebble.y, radius, 0, Math.PI * 2);
      context.stroke();
      circle(pebble.x, pebble.y, 4, PALETTE.gold);
    }
    for (const guard of state.guards) {
      if (!guard.lastStep || guard.lastStep.t > 0.6) continue;
      const radius = 6 + guard.lastStep.t * 70;
      context.strokeStyle = `rgba(180, 190, 220, ${Math.max(0, 0.5 - guard.lastStep.t * 0.7)})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(guard.lastStep.x, guard.lastStep.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawGuard(guard, alarm) {
    const x = guard.x;
    const y = guard.y;
    if (guard.kind === 'camera') {
      // A small wall camera: a dark box with a glowing lens.
      context.fillStyle = '#22263a';
      context.fillRect(x - 11, y - 8, 22, 16);
      context.fillStyle = alarm || guard.suspicion >= 70 ? PALETTE.danger : PALETTE.gold;
      circle(x + Math.cos(guard.angle) * 8, y + Math.sin(guard.angle) * 8, 4, alarm || guard.suspicion >= 70 ? PALETTE.danger : PALETTE.gold);
      context.fillStyle = PALETTE.text;
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
    } else {
      // A guard: blue uniform, brass cap, and a nose showing the way he faces.
      context.fillStyle = PALETTE.guardUniform;
      context.beginPath();
      context.arc(x, y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#2a4a7a';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(x, y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1d2f52';
      context.beginPath();
      context.arc(x, y - 2, 8, Math.PI, 0);
      context.fill();
      context.fillRect(x - 8, y - 3, 16, 3);
      const nx = x + Math.cos(guard.angle) * 12;
      const ny = y + Math.sin(guard.angle) * 12;
      context.strokeStyle = PALETTE.guard;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(nx, ny);
      context.stroke();
    }
    // Suspicion marker: "?" while wary, "!" once the guard is on to you.
    if (guard.suspicion >= 70 || alarm) {
      text('!', x, y - GUARD.radius - 10, 26, PALETTE.danger, 'center');
    } else if (guard.suspicion >= 30) {
      text('?', x, y - GUARD.radius - 10, 24, PALETTE.gold, 'center');
    }
    // Suspicion arc under the guard, so the player reads how close he is.
    if (guard.suspicion > 2) {
      context.strokeStyle = guard.suspicion >= 70 ? PALETTE.danger : PALETTE.gold;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      context.stroke();
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    // Caught: blink the thief while the level resets.
    if (p.caughtTimer > 0 && Math.floor(p.caughtTimer * 10) % 2 === 0) return;
    // Cloak: a violet hood with a pale face, and a small lantern glow.
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.arc(p.x, p.y, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2c2350';
    context.beginPath();
    context.arc(p.x, p.y - 3, 8, Math.PI, 0);
    context.fill();
    if (p.sneaking) {
      context.strokeStyle = 'rgba(201, 184, 255, 0.7)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(p.x, p.y, 18, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state, info) {
    const level = state.level;
    context.textBaseline = 'top';
    // Top-left: wing and level name.
    text(`WING ${state.levelIndex + 1} / 3 — ${level.name}`, 24, 16, 20, PALETTE.text, 'left');
    text(level.hint, 24, 42, 14, PALETTE.muted, 'left');
    // Top-centre: the relics, filled as they are pocketed.
    const relicX = FIELD.width / 2 - 30;
    for (let i = 0; i < state.relics.length; i += 1) {
      const taken = state.relics[i].taken;
      context.fillStyle = taken ? PALETTE.relic : '#3a3f52';
      context.beginPath();
      const cx = relicX + i * 34;
      context.moveTo(cx, 18);
      context.lineTo(cx + 9, 30);
      context.lineTo(cx, 42);
      context.lineTo(cx - 9, 30);
      context.closePath();
      context.fill();
    }
    // Top-right: lives and the clock.
    text(`Lives ${'♥'.repeat(state.lives)}${'♡'.repeat(Math.max(0, LIVES - state.lives))}`, FIELD.width - 24, 16, 20, PALETTE.text, 'right');
    text(formatTime((state.totalTime + state.time) * 1000), FIELD.width - 24, 42, 16, PALETTE.muted, 'right');
    // Heat bar: how close the nearest guard is to raising the alarm.
    const heat = info.heat;
    const barX = FIELD.width / 2 - 110;
    const barY = 56;
    context.fillStyle = '#232742';
    context.fillRect(barX, barY, 220, 10);
    context.fillStyle = heat >= 70 ? PALETTE.danger : heat >= 30 ? PALETTE.gold : PALETTE.relic;
    context.fillRect(barX, barY, 220 * (heat / 100), 10);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(barX, barY, 220, 10);
    text(heat >= 70 ? 'SPOTTED!' : heat >= 30 ? 'SUSPICIOUS' : 'UNSEEN', FIELD.width / 2, barY + 16, 13, heat >= 30 ? PALETTE.gold : PALETTE.muted, 'center');
    // Bottom-left: pebbles left.
    text(`Pebbles ${'●'.repeat(state.pebbleCount)}${'○'.repeat(Math.max(0, 3 - state.pebbleCount))} — click to throw`, 24, FIELD.height - 34, 16, PALETTE.muted, 'left');
    // Bottom-right: where you stand matters.
    const where = info.inShadow ? 'IN SHADOW — hard to see' : info.inLight ? 'IN THE LIGHT — easy to spot' : state.player.sneaking ? 'SNEAKING — quiet and slow' : '';
    if (where) text(where, FIELD.width - 24, FIELD.height - 34, 16, info.inShadow ? PALETTE.relic : info.inLight ? PALETTE.gold : PALETTE.muted, 'right');
    // Alarm banner: low and central, so it never covers the thief or the heat bar.
    if (state.alarm) {
      context.fillStyle = 'rgba(255, 93, 93, 0.9)';
      context.fillRect(FIELD.width / 2 - 190, FIELD.height - 78, 380, 32);
      text('⚠ ALARM — break line of sight! ⚠', FIELD.width / 2, FIELD.height - 70, 17, '#ffffff', 'center');
    }
    if (state.player.caughtTimer > 0) {
      context.fillStyle = 'rgba(255, 93, 93, 0.85)';
      context.fillRect(FIELD.width / 2 - 130, FIELD.height / 2 - 60, 260, 56);
      text('CAUGHT!', FIELD.width / 2, FIELD.height / 2 - 44, 30, '#ffffff', 'center');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 12, 24, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, accent ?? PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 18, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center');
  }

  function draw(state, screen, best, info = {}) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state);
    drawWallsAndCover(state);
    drawRelicsAndExit(state);
    drawCones(state);
    drawNight(state);
    drawPebblesAndSteps(state);
    for (const guard of state.guards) drawGuard(guard, state.alarm);
    drawPlayer(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'VELVET SHADOW',
        [
          'The Marlowe Museum, after midnight. You are Wren, the Velvet Shadow.',
          'Pocket all three relics, then slip out through the green door — unseen.',
          'Move with WASD or arrows. Hold Shift to sneak. Click to throw a pebble.',
          'Guards watch with their cones of sight; shadow hides you, lamplight betrays you.',
          best > 0 ? `Best clear time: ${formatTime(best)}` : 'No clear yet. The Star Sapphire waits.',
        ],
        'Press Space or click to start',
        PALETTE.player,
      );
      return;
    }
    drawHud(state, info);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.', 'M toggles sound. Shift sneaks. Click throws a pebble.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'CAUGHT',
        ['The museum keeps its treasures tonight.', `Best clear time: ${best > 0 ? formatTime(best) : '—'}`],
        'Press Space or click to try again',
        PALETTE.danger,
      );
    } else if (screen === SCREEN_LEVEL) {
      drawPanel(
        'WING CLEARED',
        [
          `${state.level.name} — cleared in ${formatTime(state.time * 1000)}.`,
          `Rating: ${state.rating} — ${state.rating === 'GHOST' ? 'never even suspected' : state.rating === 'SHADOW' ? 'suspected, never caught' : 'spotted, but you got away'}.`,
          `Relics pocketed: ${state.relicsTaken} of ${state.relics.length}.`,
        ],
        'Press Space for the next wing',
        PALETTE.relic,
      );
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'THE MUSEUM IS YOURS',
        [
          'All three wings cleared. Wren slips into the night with the collection.',
          `Total time: ${formatTime(state.totalTime * 1000)}.`,
          `Best clear time: ${best > 0 ? formatTime(best) : '—'}`,
        ],
        'Press Space or click to play again',
        PALETTE.gold,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
