const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 600,
    minWidth: 350,
    maxWidth: 350,
    minHeight: 600,
    maxHeight: 600,
    resizable: false,
    icon: __dirname + '/img/icon.png',
    transparent: false,
    fullscreen: false,
    fullscreenable: false,
    darkTheme: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      symbolColor: '#ff79c6',
      color: '#44475a',
      right: '0'
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

// Create myWindow, load the rest of the app, etc...
app.on('ready', function() {
});