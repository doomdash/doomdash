import https from "node:https";
import { app, type BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";

const defaultConfig = {
	channelName: "download-status-2",
	dataFolderName: "doomdash-data",
};

type IFileDownloaderConfig = {
	channelName: string;
	dataFolderName: string;
};

type IDownload = {
	url: string;
	targetFilename?: string;
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
		private window: BrowserWindow,
		private getAppPath: () => string = getAppBundlePath,
		private config: IFileDownloaderConfig = defaultConfig,
	) {}

	/**
	 * Downloads file and sends messages, regarding status of
	 * @param url
	 * @param dest
	 */
	async download({ url, targetFilename }: IDownload) {
		return new Promise((resolve, reject) => {
			const filename = targetFilename || path.basename(new URL(url).pathname);
			const dest = `${app.getPath("desktop")}/${this.config.dataFolderName}/`;
			const tempDirectory = path.join(app.getPath("temp"), filename);
			console.log("tempDir", tempDirectory);
			console.log("directory", dest);
			// 1. Check if destination directory exists. If not, create it.
			if (!fs.existsSync(dest)) {
				try {
					fs.mkdirSync(dest, { recursive: true });
				} catch (err) {
					return reject(new Error(`Could not create directory: ${dest}`));
				}
			}
			// const dest = path.join(directory, filename);
			const file = fs.createWriteStream(tempDirectory);

			// 3. Start the request
			const request = https.get(url, (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					const redirectUrl = response.headers.location;
					if (redirectUrl) {
						file.destroy();
						// Recursively call handleDownload with the redirect URL
						this.download({ url: redirectUrl, targetFilename: filename })
							.then(resolve)
							.catch(reject);
						return;
					}
				}

				if (response.statusCode !== 200) {
					file.destroy();
					fs.unlink(dest, () => {});
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
					this.window.webContents.send(this.config.channelName, message);
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
					file.close(() => {
						this.window.webContents.send(this.config.channelName, message);
						unzipFile(tempDirectory, dest);
						const uzdoomAppPath = path.join(dest, "uzdoom.app");
						grantExecutePermission(uzdoomAppPath);
						resolve(uzdoomAppPath);
					});
				});

				// Handle stream errors (e.g., disk full, permission denied)
				file.on("error", (err) => {
					file.close();
					fs.unlink(dest, () => {}); // Delete partial file
					reject(err);
				});
			});

			// Handle request errors (e.g., DNS issues, no internet)
			request.on("error", (err) => {
				file.close();
				fs.unlink(dest, () => {}); // Delete partial file
				reject(err);
			});

			request.setTimeout(30000, () => {
				request.destroy();
				file.close();
				fs.unlink(dest, () => {});
				reject(new Error("Download timed out"));
			});
		});
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

	// Ensure the destination directory exists before extraction
	if (!fs.existsSync(destPath)) {
		fs.mkdirSync(destPath, { recursive: true });
	}

	return new Promise((resolve, reject) => {
		fs.createReadStream(srcPath)
			.pipe(unzipper.Extract({ path: destPath })) // Use unzipper.Extract
			.on("finish", () => {
				resolve();
			})
			.on("error", (err) => {
				reject(
					new Error(`ZIP extraction failed for ${srcPath}: ${err.message}`),
				);
			});
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

	// 3. Grant read/write/execute permissions (0o755 or 0o777)
	// 0o755 is generally safe: User: rwx, Group/Other: rx
	try {
		await fs.promises.chmod(executablePath, 0o755);
		console.log(`Successfully set execute permission for: ${executablePath}`);
	} catch (err) {
		throw new Error(`Failed to set permissions on executable: ${err.message}`);
	}
}
