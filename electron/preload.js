const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    toggleAutoStart: (enable) => ipcRenderer.invoke('toggle-auto-start', enable),
    fetchNews: () => ipcRenderer.invoke('fetch-news'),
    showNotification: (title, body) => ipcRenderer.send('show-notification', title, body),
    setProgressBar: (progress) => ipcRenderer.send('set-progress', progress),
    flashFrame: (flash) => ipcRenderer.send('flash-frame', flash),
    toggleMiniWidget: () => ipcRenderer.send('toggle-mini-widget'),
    closeMiniWidget: () => ipcRenderer.send('close-mini-widget'),
    hideMiniWidget: () => ipcRenderer.send('hide-mini-widget'),
    // Image Actions
    copyImage: (url) => ipcRenderer.invoke('copy-image', url),
    saveImage: (url, filename) => ipcRenderer.invoke('save-image', url, filename),
    printImage: (url) => ipcRenderer.invoke('print-image', url),
});
