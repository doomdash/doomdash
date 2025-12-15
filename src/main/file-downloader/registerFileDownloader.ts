// import { type BrowserWindow, ipcMain } from "electron";
// import os from "os";
// import type { IDownload } from "./FileDownloader";

// function registerFileDownloader(
// 	download: (args: IDownload) => Promise<unknown>,
// ) {
// 	ipcMain.handle("download-file", async (_event, downloadArgs: Omit<IDownload, "window">) => {
// 		try {
// 			// // Detect operating system
// 			// const platform = os.platform();
// 			// let downloadUrl = "";

// 			// // Set download URL based on OS and source port
// 			// switch (sourcePortName) {
// 			// 	case "uzdoom":
// 			// 		if (platform === "win32") {
// 			// 			downloadUrl =
// 			// 				"https://github.com/UZDoom/UZDoom/releases/download/4.14.3/Windows-UZDoom-4.14.3.zip";
// 			// 		} else if (platform === "darwin") {
// 			// 			downloadUrl =
// 			// 				"https://github.com/UZDoom/UZDoom/releases/download/4.14.3/macOS-UZDoom-4.14.3.zip";
// 			// 		} else {
// 			// 			// For Linux, we'll use the Windows version as a placeholder
// 			// 			downloadUrl =
// 			// 				"https://github.com/UZDoom/UZDoom/releases/download/4.14.3/Windows-UZDoom-4.14.3.zip";
// 			// 		}
// 			// 		break;
// 			// 	default:
// 			// 		throw new Error(`Unsupported source port: ${sourcePortName}`);
// 			// }

// 			// // Create destination directory
// 			// const destDir = path.join(
// 			// 	app.getPath("userData"),
// 			// 	"source-ports",
// 			// 	sourcePortName,
// 			// );
// 			// if (!fs.existsSync(destDir)) {
// 			// 	fs.mkdirSync(destDir, { recursive: true });
// 			// }

// 			// Set destination file path
// 			// const fileName = `uzdoom-${platform}.zip`;
// 			// const destPath = path.join(destDir, fileName);

// 			await download({...downloadArgs, window});
// 			// Download file
// 			// await handleDownload(downloadUrl, destPath, mainWindow);

// 			// Unzip the archive
// 			// 	const unzipDir = path.join(destDir, "extracted");
// 			// 	await extract(destPath, { dir: unzipDir });

// 			// 	// Delete the archive
// 			// 	fs.unlinkSync(destPath);

// 			// 	// Log the final path
// 			// 	console.log(`Source port extracted to: ${destDir}`);

// 			// 	// Return the parent directory instead of the extracted subdirectory
// 			// 	return { success: true, path: destDir };
// 		} catch (error) {
// 			console.error("Download failed:", error);
// 			return { success: false, error: (error as Error).message };
// 		}
// 	});
// }
