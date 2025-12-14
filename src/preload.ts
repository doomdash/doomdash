import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import type { IIpcStatusMessage } from "./main/FileDownloader";

const electronAPI: Window["electron"] = {
	downloadSourcePort: (url: string) =>
		ipcRenderer.invoke("download-source-port", url),
	onDownload: (callback) => {
		const downloadHandler = (
			_event: IpcRendererEvent,
			status: IIpcStatusMessage,
		) => {
			callback(status);
		};
		ipcRenderer.on("download-status-2", downloadHandler);

		// cleanup function to be used on component unmounting
		return () => {
			ipcRenderer.removeListener("download-status-2", downloadHandler);
		};
	},
};

contextBridge.exposeInMainWorld("electron", electronAPI);
