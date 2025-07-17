const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // WiFi management functions
  connectToWiFi: (credentials) => ipcRenderer.invoke('wifi:connect', credentials),
  getWiFiStatus: () => ipcRenderer.invoke('wifi:status'),
  startSetupMode: () => ipcRenderer.invoke('wifi:startSetup'),
  stopSetupMode: () => ipcRenderer.invoke('wifi:stopSetup'),
  
  // System information
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  
  // Navigation
  navigateToHome: () => ipcRenderer.invoke('nav:home'),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('config:get'),
  
  // Text input request for mobile app
  requestTextInput: (field, currentValue) => ipcRenderer.invoke('request-text-input', field, currentValue)
});

// Config will be injected by main process via executeJavaScript
console.log('Preload script loaded - config will be injected by main process');