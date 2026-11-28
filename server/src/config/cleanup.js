import cron from "node-cron";

import fs from "fs/promises";

import path from "path";

const folders = [
    path.resolve("src/uploads"),
    path.resolve("src/compressed")
];

const MAX_FILE_AGE = 24 * 60 * 60 * 1000;

// Delete old files
const cleanupFiles = async () => {

    console.log("Starting file cleanup...");

    const currentTime = Date.now();

    for (const folder of folders) {

        try {

            const files = await fs.readdir(folder);

            for (const file of files) {

                const filePath = path.join(folder, file);

                try {

                    const stats = await fs.stat(filePath);

                    // Ignore directories
                    if (!stats.isFile()) continue;

                    const fileAge = currentTime - stats.mtimeMs;

                    if (fileAge > MAX_FILE_AGE) {

                        await fs.unlink(filePath);

                        console.log("Deleted:", file);

                    }

                } catch (error) {

                    console.error(
                        `Unable to process ${file}:`,
                        error.message
                    );

                }

            }

        } catch (error) {

            if (error.code !== "ENOENT") {
                console.error("Cleanup folder error:", error.message);
            }

        }

    }

    console.log("File cleanup completed!");

};


// Run every 30 minutes
cron.schedule("*/30 * * * *", cleanupFiles);

export default cleanupFiles;