import https from "node:https";
import { app, type BrowserWindow, type IpcMain, ipcMain } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import { extract } from "zip-lib";

const scopeLog = log.scope("FileDownloader");
const defaultConfig = {
	reporterChannelName: "download-status-2",
	handlerChannelName: "download-file",
	dataFolderName: "doomdash-data",
};

type IFileDownloaderConfig = {
	reporterChannelName: string;
	handlerChannelName: string;
	dataFolderName: string;
};

export type IDownload = {
	url: string;
	targetFilename?: string;
	targetDirectory: string;
	window?: BrowserWindow;
};

export type IIpcStatusMessage = {
	filename: string;
	status: "downloading" | "finished";
	totalSize: number;
	downloaded: number;
	percentage: string;
};

export class FileDownloader {
	constructor(
		private getAppPath: () => string = getAppBundlePath,
		private config: IFileDownloaderConfig = defaultConfig,
		private ipc: IpcMain = ipcMain,
	) {}

	/**
	 * Downloads file and sends messages, regarding status of
	 * @param url
	 * @param dest
	 */
	download = async ({
		url,
		targetFilename,
		targetDirectory,
		window,
	}: IDownload): Promise<string> => {
		if (!window)
			scopeLog.info("`window` not provided. IPC Reporting will not work.");
		scopeLog.info(`url: ${url}`);

		return new Promise((resolve, reject) => {
			const filename = targetFilename || path.basename(new URL(url).pathname);
			const targetPath = path.join(targetDirectory, filename);
			const file = fs.createWriteStream(targetPath);

			// 3. Start the request
			const request = https.get(url, (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					const redirectUrl = response.headers.location;
					scopeLog.info(`redirectUrl: ${redirectUrl}`);
					if (redirectUrl) {
						file.destroy();
						// Recursively call handleDownload with the redirect URL
						this.download({
							url: redirectUrl, // it keeps forever looping with initial url, not redirected!!
							targetFilename: filename,
							targetDirectory,
							window,
						})
							.then(resolve)
							.catch(reject);
						return;
					}
				}

				if (response.statusCode !== 200) {
					file.destroy();
					reject(
						new Error(
							`Failed to download file: ${response.statusCode} ${response.statusMessage}`,
						),
					);
					return;
				}

				// Get total size from headers (ensure it's a number)
				const totalSize = parseInt(
					response.headers["content-length"] || "0",
					10,
				);
				console.log("totalSize", totalSize);

				let downloadedSize = 0;

				response.pipe(file);

				// Track download progress
				if (window)
					response.on("data", (chunk: Buffer) => {
						downloadedSize += chunk.length;

						const percentage =
							totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
						// console.log("downloaded:", downloadedSize )
						const message: IIpcStatusMessage = {
							filename,
							status: "downloading",
							totalSize,
							downloaded: downloadedSize,
							percentage: percentage.toFixed(2),
						};
						if (window && !window.isDestroyed()) {
							window.webContents.send(this.config.reporterChannelName, message);
						}
					});

				// Handle stream completion
				file.on("finish", () => {
					const message: IIpcStatusMessage = {
						filename,
						status: "finished",
						totalSize,
						downloaded: downloadedSize,
						percentage: "100",
					};
					file.close(async () => {
						if (window && !window.isDestroyed())
							window.webContents.send(this.config.reporterChannelName, message);
						scopeLog.debug("File downloaded to:", targetPath);
						resolve(targetPath);
					});
				});

				// Handle stream errors (e.g., disk full, permission denied)
				file.on("error", (err) => {
					file.close();
					fs.unlink(targetPath, () => {}); // Delete partial file
					reject(err);
				});
			});

			// Handle request errors (e.g., DNS issues, no internet)
			request.on("error", (err) => {
				file.close();
				fs.unlink(targetPath, () => {}); // Delete partial file
				reject(err);
			});

			request.setTimeout(30000, () => {
				request.destroy();
				file.close();
				fs.unlink(targetPath, () => {});
				reject(new Error("Download timed out"));
			});
		});
	};
	register(mainWindow: BrowserWindow) {
		this.ipc.handle(
			this.config.handlerChannelName,
			async (_event, downloadArgs: Omit<IDownload, "window">) => {
				try {
					await this.download({ ...downloadArgs, window: mainWindow });
				} catch (error) {
					console.error("Download failed:", error);
					return (error as Error).message;
				}
			},
		);
	}
}

/**
 * Gets the root path to the Electron application bundle, regarding OS
 * @returns path to the application root/bundle.
 */
export function getAppBundlePath() {
	let appBundlePath = app.getPath("exe");
	switch (process.platform) {
		case "darwin": {
			const macOsBundleSuffix = /\/Contents\/MacOS\/[^/]+$/;
			if (appBundlePath.match(macOsBundleSuffix)) {
				appBundlePath = appBundlePath.replace(macOsBundleSuffix, "");
			}
			break;
		}
	}
	return appBundlePath;
}

/**
 * Decompresses a zipped file and writes it to a destination path.
 *
 * @param src The path to the source gzipped file (e.g., 'data.txt.gz').
 * @param dest The path where the decompressed file should be written (e.g., 'data.txt').
 * @returns A Promise that resolves when the decompression is complete.
 */

export function unzipFile(src: string, dest: string): Promise<void> {
	const srcPath = path.resolve(src);
	const destPath = path.resolve(dest);

	// The extract function from zip-lib handles everything:
	// - It is Promise-based (asynchronous).
	// - It automatically handles directory creation.
	// - It leverages yauzl internally for robust, stream-based extraction.
	return extract(srcPath, destPath).catch((err) => {
		// Catch any errors during the async extraction process
		return Promise.reject(
			new Error(
				`ZIP extraction failed for ${srcPath} using zip-lib: ${err instanceof Error ? err.message : String(err)}`,
			),
		);
	});
}

/**
 * Ensures the uzdoom executable inside the .app bundle has execute permission.
 * @param appBundlePath The path to the .app directory (e.g., /path/to/uzdoom.app).
 */
async function grantExecutePermission(appBundlePath: string): Promise<void> {
	// 1. Construct the path to the actual executable binary inside the bundle
	const executablePath = path.join(
		appBundlePath,
		"Contents",
		"MacOS",
		path.basename(appBundlePath, ".app"),
	);

	// 2. Check if the executable file exists
	if (!fs.existsSync(executablePath)) {
		throw new Error(
			`Executable not found inside .app bundle: ${executablePath}`,
		);
	}

	try {
		await fs.promises.chmod(executablePath, 0o755);
		console.log(`Successfully set execute permission for: ${executablePath}`);
	} catch (err) {
		throw new Error(`Failed to set permissions on executable: ${err.message}`);
	}
}
