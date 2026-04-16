# Sovereign Arcade - Audit

## File Tree
```
$(tree -I 'node_modules|.git|audit')
```

## Games Inventory

- **Hub**: `index.html`. Working.
- **Kinetic Shield**: `kinetic-shield/index.html`. Working.
- **Sovereign Vector**: `sovereign-vector/index.html`. Working.
- **Sovereign Stack**: `sovereign-stack/index.html`. Working.
- **Void Sweep**: `void-sweep/index.html`. Working.
- **Sovereign Snake**: `sovereign-snake/index.html`. Broken (missing game.js).
- **Sovereign Invaders**: `sovereign-invaders/index.html`. Working.
- **Sovereign Orbit**: `sovereign-orbit/index.html`. Working.
- **Sovereign Breakout**: `sovereign-breakout/index.html`. Working.

## Build/Run Commands
- Local server: `npx serve .`
- Electron: `npm install` then `npm start`
- Browser: Open `index.html` in browser.

## Tech Stack
- Frontend: Vanilla HTML/CSS/JS. No framework or bundler.
- Deployment: GitHub Pages. Target browsers are modern evergreen browsers.
- App wrapper: Electron.
