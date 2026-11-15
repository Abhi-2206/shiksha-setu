'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Detect whether we are running in development or production.
// The ELECTRON_ENV variable is set in the electron:dev script.
const isDev = process.env.ELECTRON_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
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

  // Open external links in the default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent in-window navigation away to external origins
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    // Development mode: load from the Vite development server
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.warn('Vite dev server not ready yet. Retrying in 1.5s...', err.message);
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173').catch((retryErr) => {
          console.error('Failed to connect to Vite dev server at http://localhost:5173:', retryErr.message);
        });
      }, 1500);
    });
  } else {
    // Production mode: load the built React application using loadFile()
    // Mandatory requirement: Use loadFile(). Do not use loadURL() with a file:// URL.
    const productionIndexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(productionIndexPath)) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
      console.error(`Production build not found at ${productionIndexPath}. Please run "npm run build" first.`);
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 48px; text-align: center; color: #2d3748;">
          <h2 style="color: #c53030; margin-bottom: 12px;">Production Build Not Found</h2>
          <p style="margin-bottom: 20px; color: #4a5568;">Please run the production build before launching the Electron application:</p>
          <pre style="background: #edf2f7; padding: 14px 20px; border-radius: 6px; display: inline-block; font-size: 14px; color: #1a202c;">cd client && npm run build</pre>
        </div>
      `)}`);
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create a window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
