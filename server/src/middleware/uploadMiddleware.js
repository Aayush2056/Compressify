import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.resolve("src/uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

const allowedFormats = [
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm"
];

const fileFilter = (req, file, cb) => {

    const extension =
        path.extname(file.originalname).toLowerCase();

    if (
        file.mimetype.startsWith("video/") &&
        allowedFormats.includes(extension)
    ) {

        cb(null, true);

    } else {

        cb(new Error("Unsupported video format"));

    }

};

const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 500 * 1024 * 1024
    }

});

export default upload;