'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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

  // Prevent unexpected in-app navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    // Development: load from Vite dev server with retry in case Vite is still booting
    win.loadURL(VITE_DEV_SERVER_URL).catch((err) => {
      console.warn('Vite dev server not ready yet. Retrying in 1.5s...', err.message);
      setTimeout(() => {
        win.loadURL(VITE_DEV_SERVER_URL).catch((retryErr) => {
          console.error('Failed to connect to Vite dev server at http://localhost:5173:', retryErr.message);
        });
      }, 1500);
    });
  } else {
    // Production: load the built React app from the dist/ folder.
    // base: './' in vite.config.js makes all asset paths relative,
    // so file:// loading works correctly.
    const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(distIndexPath)) {
      win.loadFile(distIndexPath);
    } else {
      console.error(`Production build not found at ${distIndexPath}. Please run "npm run build" first.`);
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 48px; text-align: center; color: #2d3748;">
          <h2 style="color: #c53030; margin-bottom: 12px;">Production Build Not Found</h2>
          <p style="margin-bottom: 20px; color: #4a5568;">Please run the production build before launching the Electron application in production mode:</p>
          <pre style="background: #edf2f7; padding: 14px 20px; border-radius: 6px; display: inline-block; font-size: 14px; color: #1a202c;">cd client && npm run build</pre>
        </div>
      `)}`);
    }
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
