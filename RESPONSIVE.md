# Sovereign Arcade - Responsive Hardening Pass

## Global Changes
- **Viewport Meta Tags**: Verified and standardized `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` on all `index.html` files.
- **Breakpoints**: Standardized breakpoints from scattered values (1300px, 1180px, 860px, 768px, 480px) to `max-width: 1024px` and `max-width: 640px` in all game HTML/CSS.
- **Input Handling**: Changed `mousedown` to `pointerdown` to capture both touch and mouse events in `kinetic-shield`, `sovereign-orbit` and temp files.
- **Viewport Height**: Replaced `100vh` with `100dvh` in `sovereign-stack`, `sovereign-invaders`, and `sovereign-orbit` to prevent mobile browser chrome jumpiness.
- **Canvas Sizing**: Implemented `devicePixelRatio` scaling on canvases that were missing it, ensuring sharpness on retina/mobile displays. Specifically in `sovereign-vector`, `kinetic-shield`, `void-sweep`, `temp.js`, `temp_kinetic.js`, and `sovereign-breakout`.

## File by File
- **index.html**: Viewport meta, 1024px breakpoint.
- **kinetic-shield/index.html**: Viewport meta, pointerdown, canvas dpr scaling.
- **sovereign-vector/index.html**: Viewport meta, 1024px breakpoint.
- **sovereign-vector/game.js**: Canvas dpr scaling for game canvas.
- **sovereign-stack/index.html**: Viewport meta, 100dvh.
- **void-sweep/index.html**: Viewport meta, canvas dpr scaling.
- **sovereign-snake/index.html**: Viewport meta, 640px breakpoint.
- **sovereign-snake/elite.html**: Breakpoints.
- **sovereign-invaders/index.html**: Viewport meta, 100dvh.
- **sovereign-orbit/index.html**: Viewport meta, pointerdown, 100dvh.
- **sovereign-breakout/index.html**: Viewport meta, 1024px and 640px breakpoints, canvas dpr scaling.
