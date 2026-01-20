const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 640,
    minWidth: 360,
    maxWidth: 360,
    minHeight: 640,
    maxHeight: 640,
    resizable: false,
    icon: __dirname + '/img/icon.png',
    transparent: false,
    fullscreen: false,
    fullscreenable: false,
    darkTheme: true, // System pref
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: '#00000000', // Transparent to let background show? or just default.
      symbolColor: '#747474',
      height: 30
    },
    autoHideMenuBar: false, // Keep this
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
app.on('ready', function () {
});