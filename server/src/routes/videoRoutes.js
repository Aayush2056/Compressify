import express from "express";
import { getVideoMetadata} from "../controllers/metadataController.js";
import upload from "../middleware/uploadMiddleware.js";
import { compressionLimiter } from "../middleware/rateLimitMiddleware.js";
import {
    compressVideo,
    downloadVideo,cancelCompression
} from "../controllers/videoController.js";

const router = express.Router();

router.post(
    "/compress",compressionLimiter,
    upload.single("video"),
    compressVideo
);
router.post(
    "/metadata",
    upload.single("video"),
    getVideoMetadata
);
router.get(
    "/download/:filename",
    downloadVideo
);
router.post("/cancel", cancelCompression);

export default router;