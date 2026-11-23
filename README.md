[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/starbumb/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/starbumb/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# EMBERFALL — Duel of the Four Sigils

An original one-on-one card duel for the browser, built for the make.fun
"best card game" bounty. You are the Embercaller; across the table sits
Captain Vex, an AI opponent who plays for value, trades up, hides behind
Guards and races when ahead.

## The game

- Four sigils (suits) told apart by colour **and** shape: Ember ▲, Tide ●,
  Gale ◆, Stone ■.
- 22 original cards: creatures with energy cost, attack and health, plus
  spells (damage, healing, card draw, buffs, a board wipe).
- Five abilities that combine: **Swift** (attack at once), **Guard** (must be
  attacked first), **Shield** (ignore one hit), **Drain** (heal your hero),
  **Surge** (+1 Attack per same-sigil ally — build around one sigil or splash).
- Both heroes start at 20 life. Energy grows by 1 each round up to 8. Reduce
  Vex to 0 before round 12 ends, or win on the higher life total.
- Mouse and keyboard: click cards/slots/targets, or `1`–`7` + `Q`/`W`/`E`,
  `Space` to end the turn, `H` for help, `R` for a rematch.
- Synthesised WebAudio sound effects, card deal/attack animations, and a
  confetti win screen. No network requests, no libraries, no build step.

## Run it

Serve `game/` with any static file server and open `index.html` in desktop
Chrome. To hand the entry in: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
(Node 22.18+), which copies `game/` and `screenshots/` to `out/` and writes
`out/dossier.json` with the vendored make.fun library.

## Layout

- `main.ts` — hand-in program (Node 22 standard library only)
- `vendor/makefun-game.ts` — make.fun kit library, unchanged
- `game/index.html` — the three screens (title, battle, win/loss)
- `game/cards.js` — sigils, abilities and the 22-card pool
- `game/state.js` — rules engine: turns, energy, combat, win/loss
- `game/ai.js` — Captain Vex's decision-making
- `game/render.js` — card faces, boards, hero panels, confetti
- `game/audio.js` — WebAudio sound effects
- `game/main.js` — screen flow, input, AI playback
- `screenshots/` — four renders of the game (battle cover, title, win, loss)

MIT licensed. Original idea, art (emoji + CSS), names and sounds.
