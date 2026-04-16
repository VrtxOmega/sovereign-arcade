# Security

## Scope

Sovereign Arcade is a static HTML/JavaScript application with no server-side components and no network communication beyond loading Google Fonts for typography. The persistence layer is `localStorage` only. There is no authentication, no user accounts, and no sensitive data collection.

---

## Reporting a Vulnerability

If you discover a security issue (e.g., XSS in a game's HTML, unsafe `eval`-equivalent patterns, or supply-chain concerns in `package.json` devDependencies), report it privately:

- **GitHub Security Advisories:** Open a draft advisory via *Security → Advisories → New draft advisory* in this repository.
- **Direct contact:** Reach the maintainer through the GitHub profile at [VrtxOmega](https://github.com/VrtxOmega).

Do not open a public issue for security matters until a coordinated fix is available.

---

## Supported Versions

Only the latest commit on the `main` branch is supported. No backport patches are issued for older commits or tagged releases.

---

## Electron Desktop Shell

The Electron wrapper (`launcher.js`) uses `contextIsolation: true` and `nodeIntegration: false` for all renderer processes. IPC handlers in `launcher.js` are the only bridge between the renderer and the Node.js context. Review `preload.js` for the full exposed API surface.
