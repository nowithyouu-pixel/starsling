# starsling

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/nowithyouu-pixel/starsling/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/nowithyouu-pixel/starsling/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

STARSLING is a gravity-slingshot puzzle: drag back from the pad, ride planetary gravity, catch every star shard and reach the gate across 10 hand-built levels, each with a verified solution. Keyboard + mouse, offline in the browser.

## How to play

Drag back from the launch pad to aim — the dotted path previews exactly where the comet will fly. Release to launch. Planets bend your path, black holes swallow the careless, mines punish straight lines. Collect every star shard in a level and the gate opens; touch it to clear the level. You have a few launches per level — shards you catch stay caught, so plan across launches. Clear near par for 3 stars.

- **Levels:** 10 hand-built systems — straight shots, twin suns, minefields, a black hole waltz, moving planets, and a finale that uses everything.
- **Controls:** mouse drag to aim and launch, `Space` start / next, `R` retry, `H` hint (shows a verified launch), `P` pause, `M` mute.
- **Feedback:** score, stars, best score, and level progress are saved in the browser. Synthesized WebAudio sound, no audio files.
- **Deterministic:** a seeded run plays the same every time; `?shot=title|play|clear|win&seed=1` stages the four screenshots.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/` — the playable game as static files: `index.html` plus ES modules under `game/src/` (one job each: `levels`, `physics`, `world`, `render`, `shots`, `input`, `audio`, `particles`, `config`, `random`).
- `screenshots/` — 4 real renders of the game's own code.
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged.
- `serve.ts` — a tiny static server for local play-testing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=q488z2cf&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
