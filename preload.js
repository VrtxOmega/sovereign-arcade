const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('arcade', {
  // Settings
  getSettings:  ()  => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  // Game launch
  launchGame: (gameId, relPath) => ipcRenderer.invoke('launch-game', { gameId, relPath }),

  // Window & Audio controls
  minimize:   () => ipcRenderer.send('win-minimize'),
  maximize:   () => ipcRenderer.send('win-maximize'),
  close:      () => ipcRenderer.send('win-close'),
  toggleMute: () => ipcRenderer.send('toggle-mute'),
  getMuteState: () => ipcRenderer.invoke('get-mute-state'),


  // Shell
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Events from main process
  onGameClosed: (cb) => ipcRenderer.on('game-closed', (_, id)   => cb(id)),
  onMaximized:  (cb) => ipcRenderer.on('maximized',   (_, val)  => cb(val)),
  onMuteState:  (cb) => ipcRenderer.on('mute-state',  (_, val)  => cb(val)),

  platform: process.platform,
});
