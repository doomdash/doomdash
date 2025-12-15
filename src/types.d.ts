import type {
	IDownload,
	IIpcStatusMessage,
} from "./main/file-downloader/FileDownloader";

declare global {
	interface Window {
		electron: {
			platform: NodeJS.Platform;
			downloadSourcePort: (url: string) => Promise<void>;
			handleDownload: (
				downloadArgs: Omit<IDownload, "window">,
			) => Promise<void>;
			onDownload: (callback: (status: IIpcStatusMessage) => void) => () => void;
			// onDownloadProgress: (callback: (progress: number) => void) => () => void;
			// onDownloadStatus: (callback: (status: string) => void) => () => void;
		};
	}
}
