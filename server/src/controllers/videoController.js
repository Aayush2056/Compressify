import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import fs from "fs";
import path from "path";

import { getIO } from "../config/socket.js";

ffmpeg.setFfmpegPath(ffmpegPath);

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

export const compressVideo = (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Please upload a video"
        });
    }

    const io = getIO();

    const inputPath = req.file.path;

    const originalSize = req.file.size;

    const quality = req.body.quality || "medium";

    const socketId = req.body.socketId;

    if (!qualitySettings[quality]) {

        fs.unlink(inputPath, () => {});

        return res.status(400).json({
            success: false,
            message: "Invalid compression quality"
        });

    }

    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {

        fs.unlink(inputPath, () => {});

        return res.status(400).json({
            success: false,
            message: "Socket connection not found"
        });

    }

    const outputName = `compressed-${Date.now()}.mp4`;

    const outputPath = path.join(
        "src/compressed",
        outputName
    );

    const settings = qualitySettings[quality];

    socket.emit("compression-start", {
        message: "Compression started"
    });

    ffmpeg(inputPath)

        .videoCodec("libx264")

        .outputOptions([
            `-crf ${settings.crf}`,
            `-preset ${settings.preset}`,
            "-c:a aac",
            "-b:a 128k",
            "-movflags +faststart"
        ])

        .output(outputPath)

        .on("progress", (progress) => {

            socket.emit("compression-progress", {
                percent: Math.min(
                    Math.round(progress.percent || 0),
                    99
                )
            });

        })

        .on("end", () => {

            const compressedSize =
                fs.statSync(outputPath).size;

            const savedPercentage =
                ((originalSize - compressedSize) / originalSize) * 100;

            fs.unlink(inputPath, () => {});

            socket.emit("compression-complete", {
                percent: 100
            });

            res.status(200).json({

                success: true,

                message: "Video compressed successfully",

                quality,

                originalSize,

                compressedSize,

                savedPercentage:
                    Number(savedPercentage.toFixed(2)),

                downloadUrl:
                    `/api/videos/download/${outputName}`

            });

        })

        .on("error", (error) => {

            console.error(error);

            fs.unlink(inputPath, () => {});
            fs.unlink(outputPath, () => {});

            socket.emit("compression-error", {
                message: "Compression failed"
            });

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Video compression failed"
                });
            }

        })

        .run();

};
export const downloadVideo = (req, res) => {

    const filename = path.basename(req.params.filename);

    const filePath = path.resolve(
        "src/compressed",
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