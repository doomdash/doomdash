import {contextBridge, ipcRenderer} from "electron";

contextBridge.exposeInMainWorld('electron', {
  downloadFile: (url: string) => ipcRenderer.invoke('download-file', url),
  extractZip: () => ipcRenderer.invoke('extract-zip'),
});
