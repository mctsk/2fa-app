const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 600,
    icon: __dirname + '/img/icon.png',
    transparent: true,
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be',
      height: 60
    },
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })


  if (app.isPackaged) {
    win.removeMenu()
  }

  // win.setWindowButtonVisibility(false)

  win.show()

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

var myWindow = null;

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (myWindow) {
    if (myWindow.isMinimized()) myWindow.restore();
    myWindow.focus();
  }
});

if (shouldQuit) {
  app.quit();
  return;
}

// Create myWindow, load the rest of the app, etc...
app.on('ready', function() {
});