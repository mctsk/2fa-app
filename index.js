const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 600,
    icon: __dirname + '/img/icon.png',
    transparent: true,
    fullscreen:false,
    fullscreenable :false,
    darkTheme :false,
    titleBarStyle : "hidden",
    titleBarOverlay: {
      color: '#FFF',
      symbolColor: '#333',
      height: '35px',
      right:'3px'
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