// src/preload.js
const { ipcRenderer } = require('electron');

// Exponer funciones seguras al renderer
window.electron = {
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  closeApp: () => ipcRenderer.send('close-app')
};

// Función global para io (Socket.io)
window.io = require('socket.io-client');