const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs   = require('fs');

nativeTheme.themeSource = 'dark';

// ── Settings persistence ──────────────────────────────────────────
const SETTINGS_PATH = path.join(app.getPath('userData'), 'sa_settings.json');
const DEFAULTS = {
  masterVolume: 100,
  sfxVolume: 100,
  fullscreenGames: false,
  particleEffects: true,
  reducedMotion: false,
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH))
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) };
  } catch (e) {}
  return { ...DEFAULTS };
}

function saveSettings(s) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
  } catch (e) {}
}

// ── Windows ───────────────────────────────────────────────────────
let mainWin;
const gameWindows = new Map(); // gameId -> BrowserWindow

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#050508',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'SOVEREIGN ARCADE — VERITAS OMEGA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWin.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWin.webContents.openDevTools();
  }

  mainWin.on('maximize', () => mainWin.webContents.send('maximized', true));
  mainWin.on('unmaximize', () => mainWin.webContents.send('maximized', false));
}

// ── IPC: Settings ─────────────────────────────────────────────────
ipcMain.handle('get-settings',  ()    => loadSettings());
ipcMain.handle('save-settings', (_, s) => { saveSettings(s); return true; });

// ── IPC: Game launch ──────────────────────────────────────────────
ipcMain.handle('launch-game', async (_, { gameId, relPath }) => {
  // If already open, focus it
  if (gameWindows.has(gameId)) {
    const w = gameWindows.get(gameId);
    if (!w.isDestroyed()) { w.focus(); return { success: true, existed: true }; }
    gameWindows.delete(gameId);
  }

  const absPath  = path.resolve(__dirname, relPath.replace(/\//g, path.sep));
  const fileUrl  = 'file:///' + absPath.split(path.sep).join('/');
  const settings = loadSettings();

  const gWin = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: settings.fullscreenGames,
    backgroundColor: '#050508',
    autoHideMenuBar: true,
    title: gameId,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  gWin.loadURL(fileUrl);
  gameWindows.set(gameId, gWin);
  gWin.webContents.setAudioMuted(isGlobalMuted);

  // ── Inject exit overlay once the game page has loaded ─────────
  gWin.webContents.once('did-finish-load', () => {
    gWin.webContents.executeJavaScript(`
      (function () {
        if (document.getElementById('sa-exit-overlay')) return;

        // Floating EXIT button
        const btn = document.createElement('div');
        btn.id = 'sa-exit-overlay';
        btn.title = 'Return to Sovereign Arcade (Esc)';
        btn.innerHTML = '&#9632; EXIT TO ARCADE';
        Object.assign(btn.style, {
          position:       'fixed',
          top:            '12px',
          right:          '14px',
          zIndex:         '2147483647',
          background:     'rgba(5,5,10,0.88)',
          border:         '1px solid rgba(255,215,0,0.35)',
          color:          '#FFD700',
          fontFamily:     'Inter, monospace, sans-serif',
          fontSize:       '9px',
          fontWeight:     '800',
          letterSpacing:  '1.8px',
          textTransform:  'uppercase',
          padding:        '7px 13px',
          borderRadius:   '5px',
          cursor:         'pointer',
          backdropFilter: 'blur(10px)',
          userSelect:     'none',
          transition:     'all 0.15s ease',
          pointerEvents:  'auto',
        });
        btn.addEventListener('mouseenter', () => {
          btn.style.background   = 'rgba(255,215,0,0.15)';
          btn.style.borderColor  = 'rgba(255,215,0,0.7)';
          btn.style.color        = '#fff';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background   = 'rgba(5,5,10,0.88)';
          btn.style.borderColor  = 'rgba(255,215,0,0.35)';
          btn.style.color        = '#FFD700';
        });
        btn.addEventListener('click', () => window.close());

        // ESC key closes the game window
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') window.close();
        }, true);

        document.body.appendChild(btn);
      })();
    `);
  });

  gWin.once('closed', () => {
    gameWindows.delete(gameId);
    if (mainWin && !mainWin.isDestroyed())
      mainWin.webContents.send('game-closed', gameId);
  });

  return { success: true };
});

// ── IPC: Window controls ──────────────────────────────────────────
ipcMain.on('win-minimize',  () => mainWin?.minimize());
ipcMain.on('win-maximize',  () => mainWin?.isMaximized() ? mainWin?.unmaximize() : mainWin?.maximize());
ipcMain.on('win-close',     () => { mainWin?.close(); });
ipcMain.on('open-external', (_, url) => shell.openExternal(url));

let isGlobalMuted = false;
ipcMain.handle('get-mute-state', () => isGlobalMuted);
ipcMain.on('toggle-mute', () => {
  isGlobalMuted = !isGlobalMuted;
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.setAudioMuted(isGlobalMuted);
    mainWin.webContents.send('mute-state', isGlobalMuted);
  }
  for (const [id, w] of gameWindows.entries()) {
    if (!w.isDestroyed()) {
      w.webContents.setAudioMuted(isGlobalMuted);
    }
  }
});

// ── App lifecycle ─────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
