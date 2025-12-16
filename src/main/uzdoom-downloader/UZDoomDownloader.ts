import path from "node:path";
import {
	type App,
	app,
	type BrowserWindow,
	type IpcMain,
	ipcMain,
} from "electron";
import log from "electron-log/main";
import { unzipFile as unzip } from "../unzipFile";

const scopeLog = log.scope("UzdoomDownloader");
const defaultConfig = {
	dataFolderName: "doomdash-data",
	handlerChannelName: "download-gzdoom",
	freedoomChannelName: "download-freedoom",
} as const;

export type DownloadablePackage = "uzdoom" | "freedoom";

type FileDownloaderConfig = {
	dataFolderName: string;
	handlerChannelName: string;
	freedoomChannelName: string;
};

export class UZDoomDownloader {
	constructor(
		private downloadFile: ({
			url,
			targetFilename,
			window,
		}: {
			url: string;
			targetDirectory: string;
			targetFilename?: string;
			window?: BrowserWindow;
		}) => Promise<string>,
		private ipc: IpcMain = ipcMain,
		private unzipFile: (src: string, dest: string) => Promise<void> = unzip,
		private currentPlatform: NodeJS.Platform = process.platform,
		private electronApp: App = app,
		private config: FileDownloaderConfig = defaultConfig,
	) {}

	private getDownloadUrl() {
		let url: string;
		switch (this.currentPlatform) {
			case "darwin": {
				url =
					"https://github.com/UZDoom/UZDoom/releases/download/4.14.3/macOS-UZDoom-4.14.3.zip";
				break;
			}
			case "win32": {
				url =
					"https://github.com/UZDoom/UZDoom/releases/download/4.14.3/Windows-UZDoom-4.14.3.zip";
				break;
			}
		}
		return url;
	}

	async downloadFreedoom(window?: BrowserWindow) {
		const url =
			"https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip";
		const downloadTargetDirectory = path.join(app.getPath("temp"));
		const downloadedFilePath = await this.downloadFile({
			url,
			window,
			targetDirectory: downloadTargetDirectory,
		});
		const unzipTargetDirectory = path.join(
			this.electronApp.getPath("desktop"),
			this.config.dataFolderName,
		);
		scopeLog.info(
			`Finished downloading. Downloaded path: ${downloadedFilePath}`,
		);
		await this.unzipFile(downloadedFilePath, unzipTargetDirectory);
		scopeLog.info(`Finished unzipping. Unzipped dir: ${unzipTargetDirectory}`);
	}

	async download(window?: BrowserWindow) {
		const url = this.getDownloadUrl();
		const downloadTargetDirectory = path.join(app.getPath("temp"));
		const downloadedFilePath = await this.downloadFile({
			url,
			window,
			targetDirectory: downloadTargetDirectory,
		});
		const unzipTargetDirectory = path.join(
			this.electronApp.getPath("desktop"),
			this.config.dataFolderName,
		);
		scopeLog.info(
			`Finished downloading. Downloaded path: ${downloadedFilePath}`,
		);
		await this.unzipFile(downloadedFilePath, unzipTargetDirectory);
		scopeLog.info(`Finished unzipping. Unzipped dir: ${unzipTargetDirectory}`);
	}
	registerHandler(mainWindow: BrowserWindow) {
		const channelName = this.config.handlerChannelName;
		this.ipc.handle(
			channelName,
			async (_event, targetPackage: DownloadablePackage) => {
				switch (targetPackage) {
					case "freedoom": {
						scopeLog.info(`Freedoom download invoked`);
						try {
							await this.downloadFreedoom(mainWindow);
						} catch (error) {
							scopeLog.error(`Download failed: ${error}`);
							return (error as Error).message;
						}
						break;
					}

					case "uzdoom": {
						scopeLog.info(`Uzdoom download invoked`);
						try {
							await this.download(mainWindow);
						} catch (error) {
							scopeLog.error(`Download failed: ${error}`);
							return (error as Error).message;
						}
						break;
					}
				}
			},
		);
		scopeLog.info(`Registered on channel: ${channelName}`);
	}
}
