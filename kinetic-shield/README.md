<p align="center">
  <img src="https://img.shields.io/badge/VERITAS_OMEGA-KINETIC_SHIELD-gold?style=for-the-badge&labelColor=0A0A0A&color=FFD700" alt="VERITAS Omega Badge"/>
</p>

<h1 align="center">🛡️ KINETIC SHIELD</h1>
<p align="center"><strong>VERITAS OMEGA — Tactical Defense System</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-OPERATIONAL-00D4FF?style=flat-square&labelColor=1A1A1A" alt="Status"/>
  <img src="https://img.shields.io/badge/Engine-Canvas_2D-FFD700?style=flat-square&labelColor=1A1A1A" alt="Engine"/>
  <img src="https://img.shields.io/badge/Framework-Vanilla_JS-00ffaa?style=flat-square&labelColor=1A1A1A" alt="Framework"/>
</p>

---

## 🎮 Play Now

**[▶ Launch Kinetic Shield](https://vrtxomega.github.io/kinetic-shield/)**

---

## Overview

Kinetic Shield is a high-fidelity missile defense game built under the **VERITAS Omega** design system. Defend your datacenters from hostile audit attacks using precision interceptors, strategic upgrades, and devastating AEGIS EMP strikes.

Built as a single-file application — zero dependencies, zero build step, pure HTML5 Canvas + JavaScript.

## Features

- **Gold-and-Obsidian Design** — Premium VERITAS aesthetic with glassmorphism HUD, particle effects, and cinematic screen shake.
- **Adrenaline Dilation** — Time slows during critical near-misses for clutch intercepts.
- **Upgrade Terminal** — Spend credits on Yield Enhancers, Velocity Drives, Mag-Feeds, AEGIS EMPs, and infrastructure repairs.
- **Persistent Progression** — Career profile tracks lifetime intercepts, layers cleared, credits earned, and flawless runs across sessions.
- **12 Trophies** — Unlock achievements from "First Blood" to "Legend" (Layer 20).
- **Leaderboard** — Top 10 high scores sorted by layer reached.
- **Redline Multiplier** — Flawless waves stack a score/credit multiplier up to 3x.
- **LocalStorage Saves** — Resume in-progress runs and preserve career data.

## Controls

| Input | Action |
|-------|--------|
| **Click** | Fire interceptor at cursor position |
| **1 / 2 / 3** | Select battery (left / center / right) |
| **Spacebar** | Deploy AEGIS EMP (clears all threats) |
| **P / Escape** | Pause (includes Settings) |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Rendering | HTML5 Canvas 2D |
| UI | DOM overlays with CSS glassmorphism |
| Audio | Web Audio API (synthesized SFX) |
| Persistence | localStorage |
| Typography | Inter (Google Fonts) |
| Dependencies | **None** |

## Local Development

```bash
# Just open the file — no build step required
start index.html
```

Or serve it locally:
```bash
npx -y serve .
```

---

<p align="center">
  <sub>Built with the <strong>VERITAS Omega</strong> framework · VrtxOmega</sub>
</p>
