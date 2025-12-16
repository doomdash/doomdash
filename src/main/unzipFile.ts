import fs from "node:fs/promises";
import path from "node:path";

/**
 * Decompresses a zipped file and writes it to a destination path.
 *
 * @param src The path to the source gzipped file (e.g., 'data.txt.gz').
 * @param dest The path where the decompressed file should be written (e.g., 'data.txt').
 * @returns A Promise that resolves when the decompression is complete.
 */

import { extract } from "zip-lib/lib";

export async function unzipFile(src: string, dest: string): Promise<void> {
	const srcPath = path.resolve(src);
	const destPath = path.resolve(dest);

	try {
		await extract(srcPath, destPath);
		fs.unlink(srcPath);
	} catch (err) {
		throw new Error(
			`ZIP extraction failed for ${srcPath}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}
