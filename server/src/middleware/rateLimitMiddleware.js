import rateLimit from "express-rate-limit";

// General API rate limiter
export const apiLimiter = rateLimit({

    windowMs: 15 * 60 * 1000, // 15 minutes

    limit: 100,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests. Please try again after 15 minutes."
    }

});


// Video compression rate limiter
export const compressionLimiter = rateLimit({

    windowMs: 60 * 60 * 1000, // 1 hour

    limit: 20,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        success: false,
        message: "Compression limit reached. Maximum 20 requests per hour."
    }

});