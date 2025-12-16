import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { type App, app, type IpcMain, ipcMain } from "electron";
import log from "electron-log/main";

const scopeLog = log.scope("GameLauncher");

const defaultConfig = {
	handlerChannelName: "start-game",
} as const;

type GameLauncherConfig = {
	handlerChannelName: string;
};

export class GameLauncher {
	constructor(
		private ipc: IpcMain = ipcMain,
		private currentPlatform: NodeJS.Platform = process.platform,
		private electronApp: App = app,
		private config: GameLauncherConfig = defaultConfig,
	) {}

	private setExecutionPermissions = async (executablePath: string) => {
		if (!fs.existsSync(executablePath)) {
			throw new Error(`Executable not found: ${executablePath}`);
		}

		if (this.currentPlatform === "win32") {
			scopeLog.info(
				"Skipping chmod: Windows uses file extensions for execution.",
			);
			return;
		}

		try {
			await fs.promises.chmod(executablePath, 0o755);
			scopeLog.info(
				`Successfully set execute permission for: ${executablePath}`,
			);
		} catch (err) {
			throw new Error(`Failed to set permissions: ${err.message}`);
		}
	};

	private execute = async (
		game: "freedoom-2" | "freedoom-1",
	): Promise<void> => {
		// 1. Better path segments
		const desktopPath = this.electronApp.getPath("desktop");
		const dataDir = path.join(desktopPath, "doomdash-data");

		// 2. Define WAD path
		const wadFileName =
			game === "freedoom-1" ? "freedoom1.wad" : "freedoom2.wad";
		const wadFilePath = path.join(dataDir, "freedoom-0.13.0", wadFileName);

		// 3. Define Executable path with safety fallback
		let uzdoomPath: string;
		if (this.currentPlatform === "win32") {
			uzdoomPath = path.join(dataDir, "uzdoom.exe");
		} else if (this.currentPlatform === "darwin") {
			uzdoomPath = path.join(
				dataDir,
				"uzdoom.app",
				"Contents",
				"MacOS",
				"uzdoom",
			);
		} else {
			throw new Error(`Unsupported platform: ${this.currentPlatform}`);
		}

		// 4. Permissions (only does work on Mac/Linux)
		await this.setExecutionPermissions(uzdoomPath);

		const args: string[] = ["-iwad", wadFilePath];

		return new Promise((resolve, reject) => {
			const uzdoomProcess = spawn(uzdoomPath, args, {
				detached: true,
				stdio: "ignore",
			});

			// Handle immediate startup errors (e.g., file not found)
			uzdoomProcess.on("error", (err: Error) => {
				reject(new Error(`Failed to start process: ${err.message}`));
			});

			// Since you used detached + unref, we resolve as soon as
			// the process "spawns" successfully.
			// We use a small timeout or 'spawn' event to ensure it didn't immediate crash.
			uzdoomProcess.unref();

			// Resolve immediately so the UI isn't "stuck" waiting for the game to close
			resolve();
		});
	};

	registerHandler() {
		const channelName = this.config.handlerChannelName;
		this.ipc.handle(
			channelName,
			async (_event, game: "freedoom-1" | "freedoom-2") => {
				scopeLog.info(`freedoom-1 start invoked`);
				try {
					await this.execute(game);
				} catch (error) {
					scopeLog.error(`start failed: ${error}`);
					return (error as Error).message;
				}
			},
		);
		scopeLog.info(`Registered on channel: ${channelName}`);
	}
}
