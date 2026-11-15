'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// In development: Vite dev server must already be running on this port.
// In production: Electron loads the built React files from the dist/ folder.
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// Detect whether we are in development (npm run electron:dev) or production.
// The ELECTRON_ENV variable is set in the electron:dev npm script.
const isDev = process.env.ELECTRON_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'ShikshaSetu — AI-Powered Student Assistance',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external links in the system browser, not inside Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // Development: load from Vite dev server (proxy handles /api → Express)
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // Production: load the built React app from the dist/ folder.
    // base: './' in vite.config.js makes all asset paths relative,
    // so file:// loading works correctly.
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create a window when the dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS where apps stay alive until Cmd+Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
