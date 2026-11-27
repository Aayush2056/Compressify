import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";

import fs from "fs";

ffmpeg.setFfprobePath(ffprobe.path);

export const getVideoMetadata = (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a video"
            });
        }

        const videoPath = req.file.path;

        ffmpeg.ffprobe(videoPath, (error, metadata) => {

            if (error) {

                fs.unlink(videoPath, () => {});

                return res.status(500).json({
                    success: false,
                    message: "Unable to read video metadata"
                });

            }

            const videoStream = metadata.streams.find(
                stream => stream.codec_type === "video"
            );

            if (!videoStream) {

                fs.unlink(videoPath, () => {});

                return res.status(400).json({
                    success: false,
                    message: "Invalid video file"
                });

            }

            const response = {

                success: true,

                metadata: {

                    filename: req.file.originalname,

                    size: req.file.size,

                    duration: metadata.format.duration,

                    format: metadata.format.format_name,

                    resolution: `${videoStream.width}x${videoStream.height}`,

                    codec: videoStream.codec_name,

                    frameRate: videoStream.r_frame_rate

                }

            };

            fs.unlink(videoPath, () => {});

            return res.status(200).json(response);

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }

};