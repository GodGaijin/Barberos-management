const { contextBridge, ipcRenderer } = require('electron');

// API para actualizaciones
contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Exponer APIs protegidas al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  dbRun: (query, params) => ipcRenderer.invoke('db-run', query, params),
  dbGet: (query, params) => ipcRenderer.invoke('db-get', query, params),
  // Authentication
  login: (username, password) => ipcRenderer.invoke('auth-login', username, password),
  // Window events
  on: (channel, callback) => {
    const validChannels = ['window-focused'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  // Fix focus
  fixFocus: () => ipcRenderer.send('fix-focus'),
  // Tutoriales
  tutorialGetProgress: (tutorialId) => ipcRenderer.invoke('tutorial-get-progress', tutorialId),
  tutorialSaveProgress: (tutorialId, etapa, completado, datosAdicionales) => ipcRenderer.invoke('tutorial-save-progress', tutorialId, etapa, completado, datosAdicionales),
  tutorialGetAllProgress: () => ipcRenderer.invoke('tutorial-get-all-progress')
});

