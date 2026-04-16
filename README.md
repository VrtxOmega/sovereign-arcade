<div align="center">
  <img src="https://img.shields.io/badge/VERITAS-%CE%A9-FFD700?style=for-the-badge&logoColor=black&color=000000" alt="VERITAS OMEGA" />
  &nbsp;
  <a href="https://vrtxomega.github.io/sovereign-arcade/"><img src="https://img.shields.io/badge/Live%20Site-GitHub%20Pages-2ea44f?style=for-the-badge" alt="Live Site — GitHub Pages" /></a>
  <br /><br />
  <strong>SOVEREIGN ARCADE — Front-facing game showcase of the VERITAS &amp; Sovereign Ecosystem.</strong>
</div>

---

## Live Site

Deployed continuously to GitHub Pages from the `main` branch:

**https://vrtxomega.github.io/sovereign-arcade/**

---

## Ecosystem Canon

Sovereign Arcade is the interactive front of the Omega Universe — a deterministic, privacy-first technology stack engineered under the VERITAS Gold-and-Obsidian standard. The arcade demonstrates that high-fidelity, zero-dependency software can deliver premium operator-grade experiences without cloud dependency or framework overhead. Each title within the suite operates as an autonomous execution unit unified by a shared design contract, persistence model, and launcher shell. The collection is authored and maintained by VrtxOmega as a permanent, auditable artifact of the Omega Universe build record.

---

## Overview

**What it is:**
Sovereign Arcade is a unified, eight-title HTML/JavaScript arcade suite deployable as a static web site or a frameless Electron desktop application. All games share a single design system (Gold-and-Obsidian palette, glassmorphism panels, Inter typography) and a common `localStorage` persistence layer for scores, achievements, and session state.

**What it is not:**
This is not a framework, a game engine, or a SaaS product. It carries no runtime cloud dependency, no third-party analytics, and no telemetry. The Electron desktop wrapper is optional; every title runs in any modern browser directly from `index.html`.

---

## Included Games / Modules

| Directory | Title | Archetype |
|-----------|-------|-----------|
| `sovereign-vector/` | Sovereign Vector | Asteroids — omnidirectional zero-G ballistics |
| `kinetic-shield/` | Kinetic Shield | Missile Command — atmospheric bombardment defense |
| `sovereign-breakout/` | Sovereign Breakout | Breakout — kinetic brick desegregation |
| `sovereign-orbit/` | Sovereign Orbit | Lunar Lander — thrust-based lunar insertion |
| `sovereign-invaders/` | Sovereign Invaders | Space Invaders — grid-structured threat repolarization |
| `sovereign-stack/` | Sovereign Stack | Tetris — geometric compression logic |
| `sovereign-snake/` | Sovereign Snake | Snake — high-velocity temporal ingestion |
| `void-sweep/` | Void Sweep | Minesweeper — grid-based probability detonation |

Shared assets (fonts, icons, logo marks) reside in `assets/`. The launcher hub entry points are `index.html` (browser/web) and `launcher.js` (Electron main process).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     SOVEREIGN ARCADE HUB                       │
│              index.html  ·  launcher.js (Electron)             │
└─────────────────────────────┬──────────────────────────────────┘
                              │  IPC (Electron) / file:// nav
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                     ▼
   ┌─────────────┐   ┌─────────────┐     ┌──────────────────┐
   │ Game Module │   │ Game Module │ ... │  Game Module     │
   │  (HTML/JS)  │   │  (HTML/JS)  │     │   (HTML/JS)      │
   └──────┬──────┘   └──────┬──────┘     └────────┬─────────┘
          │                 │                      │
          └─────────────────┴──────────────────────┘
                            │
               ┌────────────▼─────────────┐
               │     Persistence Layer     │
               │   browser localStorage    │
               │  (scores · achievements   │
               │   · settings · sessions)  │
               └───────────────────────────┘

  Desktop only:
  launcher.js ──► sa_settings.json (Electron userData path)
                  master volume · SFX · fullscreen · particles
```

---

## Persistence Model

All game-state persistence uses the browser's native `localStorage` API. There is no server-side database, no account system, and no network call involved in saving or loading progress.

Each title writes to namespaced keys covering:

- **Score ledger** — top runs maintained under a standardised `LB_KEY` scheme per title.
- **Achievement registry** — up to 10 milestone achievements per title stored as boolean/count pairs and evaluated at game-over.
- **Session counters** — play-count, blocks destroyed, accuracy quotients, and similar per-game telemetry written at each `doGameOver()` invocation.

The Electron desktop shell additionally writes `sa_settings.json` (master volume, SFX volume, fullscreen preference, particle effects, reduced-motion flag) to the OS Electron `userData` path. This file is independent of the browser deployment and is not synced across devices.

---

## Quickstart

### Web — zero install

Visit the live deployment:

```
https://vrtxomega.github.io/sovereign-arcade/
```

### Local — static file server

```bash
npx serve .
# Open http://localhost:3000
```

No Node.js installation is required beyond `npx` to serve the static files.

### Local — Electron desktop

```bash
npm install          # installs the Electron devDependency
npm start            # launches the frameless desktop shell
npm run dev          # launches with DevTools open
```

### Windows one-click launcher

Three Windows helpers are included for operators who prefer not to use a terminal:

- **`SovereignArcade.bat`** — auto-installs dependencies on first run, then launches Electron.
- **`SovereignArcade.vbs`** — silent wrapper that invokes the `.bat` without opening a console window.
- **`create_shortcut.py`** — generates a desktop shortcut pointing to the `.vbs` launcher.

Run `python create_shortcut.py` once to place the shortcut, then use it for all subsequent launches.

---

## Development Workflow

```bash
# Clone
git clone https://github.com/VrtxOmega/sovereign-arcade.git
cd sovereign-arcade

# Install Electron (required only for desktop development)
npm install

# Launch desktop shell
npm start

# Launch with DevTools
npm run dev

# Run tests (Sovereign Snake unit suite)
npm test
```

Individual game modules are self-contained HTML/JS files. Open any module's `index.html` directly in a browser, or serve the root with `npx serve .`, to iterate without Electron overhead. No build step is required for any module.

---

## Deployment

The live site is deployed automatically to **GitHub Pages** from the `main` branch root. No build step or CI compilation is required — `index.html` and all game module directories are served directly as static files.

Pushing any commit to `main` triggers the `github-pages` environment deployment. The new version is typically live within 60 seconds of the push completing.

---

## Roadmap

- [ ] Unified achievement overlay accessible from the hub without entering individual games
- [ ] Cross-game aggregate leaderboard rendered on the hub home screen
- [ ] Mobile-responsive layout pass for the hub shell
- [ ] Per-game audio toggle preserved in `sa_settings.json`
- [ ] Continuous integration pipeline for expanded game-logic unit tests

---

## Omega Universe Cross-Links

| Project | Role |
|---------|------|
| [omega-brain-mcp](https://github.com/VrtxOmega/omega-brain-mcp) | Central MCP orchestration layer — AI reasoning backbone of the Omega Universe |
| [veritas-vault](https://github.com/VrtxOmega/veritas-vault) | Encrypted knowledge store and document registry |
| [Ollama-Omega](https://github.com/VrtxOmega/Ollama-Omega) | Sovereign Ollama bridge — local and cloud model MCP server |
| [Aegis](https://github.com/VrtxOmega/Aegis) | Security and privacy governance layer |
| [drift](https://github.com/VrtxOmega/drift) | Continuous deployment and drift-correction subsystem |
| [SovereignMedia](https://github.com/VrtxOmega/SovereignMedia) | Media pipeline and content management node |

---

## License

All VERITAS OMEGA branding, source code structure, and Gold-and-Obsidian design system artifacts are governed under strict sovereign use protocols. Commercial redistribution requires explicit written authorization from VrtxOmega.

The software is provided "AS IS," without warranty of any kind. The authors and maintainers accept no liability for claims, damages, or other liability arising from the use of or dealings in the software.

---

<div align="center">
  <sub>Maintained by VERITAS OMEGA &nbsp;·&nbsp; Status: OPERATIONAL &nbsp;·&nbsp; Ecosystem: Omega Universe</sub>
</div>
