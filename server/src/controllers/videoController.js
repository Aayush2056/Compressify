import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import fs from "fs";
import path from "path";

import { getIO } from "../config/socket.js";
import { validateVideo } from "../utils/videoValidation.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const compressedDir = path.resolve("src/compressed");

fs.mkdirSync(compressedDir, { recursive: true });

const activeCompressions = new Map();

const qualitySettings = {

    low: {
        crf: 32,
        preset: "fast"
    },

    medium: {
        crf: 28,
        preset: "medium"
    },

    high: {
        crf: 23,
        preset: "slow"
    }

};


// Compress Video
export const compressVideo = async (req, res) => {

    let inputPath;
    let outputPath;
    let socket;
    let socketId;
    let compressionJob;

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a video"
            });
        }

        inputPath = req.file.path;

        const originalSize = req.file.size;

        // Quality validation
        const quality = req.body.quality || "medium";

        if (!qualitySettings[quality]) {

            fs.unlink(inputPath, () => {});

            return res.status(400).json({
                success: false,
                message: "Invalid compression quality"
            });

        }

        // Socket validation
        const io = getIO();

        socketId = req.body.socketId;

        socket = io?.sockets.sockets.get(socketId);

        if (!socket) {

            fs.unlink(inputPath, () => {});

            return res.status(400).json({
                success: false,
                message: "Socket connection not found"
            });

        }

        // Video validation
        const metadata = await validateVideo(inputPath);

        console.log("Video Metadata:", metadata);

        const outputName =
            `compressed-${Date.now()}-${Math.round(Math.random() * 10000)}.mp4`;

        outputPath = path.join(compressedDir, outputName);

        const settings = qualitySettings[quality];

        socket.emit("compression-start", {
            message: "Video compression started",
            quality
        });

        // FFmpeg compression
        await new Promise((resolve, reject) => {

            const command = ffmpeg(inputPath)
                .videoCodec("libx264")
                .outputOptions([
                    `-crf ${settings.crf}`,
                    `-preset ${settings.preset}`,
                    "-c:a aac",
                    "-b:a 128k",
                    "-movflags +faststart"
                ])
                .output(outputPath);

           compressionJob = {
    command,
    outputPath,
    cancelled: false
};

if (!activeCompressions.has(socketId)) {
    activeCompressions.set(socketId, new Set());
}

activeCompressions.get(socketId).add(compressionJob);

            command

                .on("progress", (progress) => {

                    const percent = Math.min(
                        Math.round(progress.percent || 0),
                        99
                    );

                    socket.emit("compression-progress", {
                        percent
                    });

                })

                .on("end", () => {
                    resolve();
                })

                .on("error", (error) => {

                    // Ignore FFmpeg error if cancellation was requested
                    if (compressionJob.cancelled) {
                        resolve();
                        return;
                    }

                    reject(error);

                })

                .run();

        });

        // Check cancellation
        if (compressionJob?.cancelled) {
            throw new Error("COMPRESSION_CANCELLED");
        }

        // Compression statistics
        const compressedSize = fs.statSync(outputPath).size;

        const sizeDifference = originalSize - compressedSize;

        const savedPercentage =
            (sizeDifference / originalSize) * 100;

        const compressionRatio =
            originalSize / compressedSize;

        // Delete original uploaded video
        fs.unlink(inputPath, (error) => {

            if (error) {
                console.error("Original file cleanup failed:", error);
            }

        });

        socket.emit("compression-complete", {
            percent: 100,
            message: "Compression completed successfully"
        });

        return res.status(200).json({

            success: true,

            message: "Video compressed successfully",

            video: {
                quality,
                duration: metadata.duration,
                resolution: metadata.resolution,
                codec: metadata.codec
            },

            statistics: {

                originalSize,
                compressedSize,

                originalSizeMB: Number(
                    (originalSize / (1024 * 1024)).toFixed(2)
                ),

                compressedSizeMB: Number(
                    (compressedSize / (1024 * 1024)).toFixed(2)
                ),

                spaceSavedBytes: Math.max(0, sizeDifference),

                spaceSavedMB: Number(
                    (Math.max(0, sizeDifference) / (1024 * 1024)).toFixed(2)
                ),

                savedPercentage: Number(
                    savedPercentage.toFixed(2)
                ),

                compressionRatio: Number(
                    compressionRatio.toFixed(2)
                )

            },

            downloadUrl:
                `/api/videos/download/${outputName}`

        });

    } catch (error) {

        // Cancellation handling
        if (compressionJob?.cancelled) {

            if (inputPath && fs.existsSync(inputPath)) {
                fs.unlink(inputPath, () => {});
            }

            if (outputPath && fs.existsSync(outputPath)) {
                fs.unlink(outputPath, () => {});
            }

            socket?.emit("compression-cancelled", {
                message: "Compression cancelled successfully"
            });

            if (!res.headersSent) {
                return res.status(200).json({
                    success: true,
                    cancelled: true,
                    message: "Compression cancelled successfully"
                });
            }

            return;
        }

        console.error("Compression Error:", error);

        // Normal error cleanup
        if (inputPath && fs.existsSync(inputPath)) {
            fs.unlink(inputPath, () => {});
        }

        if (outputPath && fs.existsSync(outputPath)) {
            fs.unlink(outputPath, () => {});
        }

        socket?.emit("compression-error", {
            message: error.message || "Video compression failed"
        });

        if (!res.headersSent) {

            const isValidationError = [
                "Invalid or corrupted video file",
                "No valid video stream found",
                "Invalid video duration",
                "Video duration cannot exceed 10 minutes",
                "Maximum supported resolution is 4K"
            ].includes(error.message);

            return res.status(isValidationError ? 400 : 500).json({

                success: false,

                message: error.message || "Internal server error"

            });

        }

    } finally {

    if (socketId && compressionJob) {

        const jobs = activeCompressions.get(socketId);

        if (jobs) {

            jobs.delete(compressionJob);

            if (jobs.size === 0) {
                activeCompressions.delete(socketId);
            }

        }

    }

}

};


// Cancel Compression
export const cancelCompression = (req, res) => {

    const { socketId } = req.body;

    if (!socketId) {
        return res.status(400).json({
            success: false,
            message: "Socket ID is required"
        });
    }

    const jobs = activeCompressions.get(socketId);

    if (!jobs || jobs.size === 0) {
        return res.status(404).json({
            success: false,
            message: "No active compression found"
        });
    }

    for (const job of jobs) {

        if (!job.cancelled) {

            job.cancelled = true;

            job.command.kill("SIGKILL");

        }

    }

    return res.status(200).json({
        success: true,
        message: "All active compressions cancelled"
    });

};


// Download Video
export const downloadVideo = (req, res) => {

    const filename = path.basename(req.params.filename);

    const filePath = path.join(
        compressedDir,
        filename
    );

    if (!fs.existsSync(filePath)) {

        return res.status(404).json({
            success: false,
            message: "Compressed video not found"
        });

    }

    res.download(filePath);

};