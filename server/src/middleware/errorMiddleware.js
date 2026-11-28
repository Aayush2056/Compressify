import multer from "multer";

const errorMiddleware = (err, req, res, next) => {

    console.error("ERROR:", err);

    let statusCode = err.statusCode || 500;

    let message = err.message || "Internal Server Error";

    // Multer errors
    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            statusCode = 413;
            message = "Video size cannot exceed 500 MB";
        }
       else if (err.message === "Request aborted") {
    return res.status(400).json({
        success: false,
        message: "Video upload was interrupted. Please upload again."
    });
} 
        else {
            statusCode = 400;
            message = "Video upload failed";
        }

    }

    // Unsupported file format
    if (err.message === "Unsupported video format") {

        statusCode = 400;

        message = "Only MP4, MOV, AVI, MKV and WEBM are supported";

    }

    res.status(statusCode).json({

        success: false,

        status: err.status || "error",

        message

    });

};

export default errorMiddleware;