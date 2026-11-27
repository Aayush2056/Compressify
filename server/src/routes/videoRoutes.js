import express from "express";
import { getVideoMetadata} from "../controllers/metadataController.js";
import upload from "../middleware/uploadMiddleware.js";

import {
    compressVideo,
    downloadVideo
} from "../controllers/videoController.js";

const router = express.Router();

router.post(
    "/compress",
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

export default router;