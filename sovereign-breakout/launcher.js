// SOVEREIGN BREAKOUT — Veritas Launcher (Ghost Executive Pattern)
// Creates a named ghost executable so the app appears distinctly in Task Manager.

const { app, BrowserWindow, shell } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { execFileSync } = require('child_process');

// ── Ghost Executive ────────────────────────────────────────────────
const PRODUCT_NAME  = 'SovereignBreakout';
const GHOST_DIR     = path.join(__dirname, 'node_modules', 'electron', 'dist');
const GHOST_EXE     = path.join(GHOST_DIR, `${PRODUCT_NAME}.exe`);
const ELECTRON_EXE  = path.join(GHOST_DIR, 'electron.exe');
const RCEDIT        = 'C:\\Users\\rlope\\AppData\\Local\\electron-builder\\Cache\\winCodeSign\\winCodeSign-2.6.0\\rcedit-x64.exe';

function ensureGhostExe() {
  try {
    if (!fs.existsSync(GHOST_EXE) && fs.existsSync(ELECTRON_EXE)) {
      fs.copyFileSync(ELECTRON_EXE, GHOST_EXE);
      if (fs.existsSync(RCEDIT)) {
        execFileSync(RCEDIT, [GHOST_EXE,
          '--set-version-string', 'ProductName',       PRODUCT_NAME,
          '--set-version-string', 'FileDescription',   'Sovereign Breakout — VERITAS OMEGA',
          '--set-version-string', 'InternalName',      PRODUCT_NAME,
          '--set-version-string', 'OriginalFilename',  `${PRODUCT_NAME}.exe`,
          '--set-file-version',   '1.0.0',
          '--set-product-version','1.0.0',
        ], { timeout: 8000 });
      }
    }
  } catch(e) { /* fall through to standard electron.exe */ }
}

// ── Window ─────────────────────────────────────────────────────────
let win;

function createWindow() {
  win = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    title: 'SOVEREIGN BREAKOUT — VERITAS OMEGA',
    backgroundColor: '#050508',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.argv.includes('--inspect')) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  ensureGhostExe();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
