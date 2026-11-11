'use strict';

const { contextBridge } = require('electron');

// Expose a minimal, safe API surface to the renderer process.
// contextIsolation: true ensures the renderer cannot access Node.js directly.
// Only add entries here when a specific renderer capability genuinely requires
// communication with the main process (e.g. native file dialogs, OS notifications).
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
