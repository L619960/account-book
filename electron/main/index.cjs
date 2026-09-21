const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// IPC 处理
ipcMain.handle('get-app-path', () => app.getPath('appData'))
ipcMain.handle('get-version', () => '1.0.0')
ipcMain.handle('get-platform', () => process.platform)

let mainWindow = null

function createWindow() {
  // 打包后所有文件都在 app.asar 内，app.getAppPath() 指向 asar 根；
  // 开发时直接用 electron 跑 dist-electron/main/index.js，app.getAppPath()
  // 会指向主进程所在目录，此时回退到进程工作目录（项目根）。
  const appPath = app.isPackaged ? app.getAppPath() : process.cwd()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    maxWidth: 1600,
    maxHeight: 1200,
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(appPath, 'dist-electron', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: false,
      sandbox: false
    }
  })

  // 页面路径：electron-builder 默认把 dist 打进 app.asar 内，
  // Electron 的 loadFile 可直接读取 asar 内文件，无需解包到 app.asar.unpacked
  const indexPath = path.join(appPath, 'dist', 'index.html')

  console.log('应用路径:', appPath)
  console.log('页面路径:', indexPath)

  // 加载页面
  mainWindow.loadFile(indexPath).then(() => {
    console.log('页面加载成功')
  }).catch((err) => {
    console.error('页面加载失败:', err)
  })

  // 页面事件
  mainWindow.webContents.on('did-finish-load', () => console.log('页面加载完成'))
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => console.error('页面加载失败:', code, desc))
  mainWindow.webContents.on('dom-ready', () => console.log('DOM 就绪'))

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('Electron 启动')
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
