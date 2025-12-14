import type { IIpcStatusMessage } from "./main/FileDownloader";

declare global {
	interface Window {
		electron: {
			downloadSourcePort: (url: string) => Promise<void>;
			onDownload: (callback: (status: IIpcStatusMessage) => void) => () => void; /// HOW
			// onDownloadProgress: (callback: (progress: number) => void) => () => void;
			// onDownloadStatus: (callback: (status: string) => void) => () => void;
		};
	}
}
