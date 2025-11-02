const { ipcRenderer } = require('electron');

// Exponer funciones seguras al renderer
window.electron = {
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  closeApp: () => ipcRenderer.send('close-app')
};