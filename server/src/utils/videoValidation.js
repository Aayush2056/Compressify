import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";

ffmpeg.setFfprobePath(ffprobe.path);

const MAX_DURATION = 600; // 10 minutes

const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;

export const validateVideo = (filePath) => {

    return new Promise((resolve, reject) => {

        ffmpeg.ffprobe(filePath, (error, metadata) => {

            if (error) {
                return reject(
                    new Error("Invalid or corrupted video file")
                );
            }

            const videoStream = metadata.streams.find(
                stream => stream.codec_type === "video"
            );

            if (!videoStream) {
                return reject(
                    new Error("No valid video stream found")
                );
            }

            const duration = Number(metadata.format.duration);

            const width = videoStream.width;
            const height = videoStream.height;

            if (!Number.isFinite(duration) || duration <= 0) {
                return reject(
                    new Error("Invalid video duration")
                );
            }

            if (duration > MAX_DURATION) {
                return reject(
                    new Error("Video duration cannot exceed 10 minutes")
                );
            }

            if (
                width > MAX_WIDTH ||
                height > MAX_HEIGHT
            ) {
                return reject(
                    new Error("Maximum supported resolution is 4K")
                );
            }

            resolve({

                duration,

                width,

                height,

                resolution: `${width}x${height}`,

                codec: videoStream.codec_name,

                format: metadata.format.format_name,

                frameRate: videoStream.r_frame_rate

            });

        });

    });

};