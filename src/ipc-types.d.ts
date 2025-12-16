import type {
	IDownload,
	IIpcStatusMessage,
} from "./main/file-downloader/FileDownloader";
import type { DownloadablePackage } from "./main/uzdoom-downloader/UZDoomDownloader";

declare global {
	interface Window {
		electron: {
			platform: NodeJS.Platform;
			downloadSourcePort: (url: string) => Promise<void>;
			handleDownloadUzdoom: (
				targetPackage: DownloadablePackage,
			) => Promise<void>;
			handleStart: (game: "freedoom-1" | "freedoom-2") => Promise<void>;
			onDownload: (callback: (status: IIpcStatusMessage) => void) => () => void;
			// onDownloadProgress: (callback: (progress: number) => void) => () => void;
			// onDownloadStatus: (callback: (status: string) => void) => () => void;
		};
	}
}
