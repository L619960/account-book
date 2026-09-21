import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用路径
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  // 获取应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
  // 平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform')
})
