import express from "express";
import cors from "cors";

import { createServer } from "http";

import { Server } from "socket.io";

import videoRoutes from "./src/routes/videoRoutes.js";

import { setIO } from "./src/config/socket.js";

import errorMiddleware from "./src/middleware/errorMiddleware.js";

import cleanupFiles from "./src/config/cleanup.js";

import { apiLimiter } from "./src/middleware/rateLimitMiddleware.js";
const app = express();

const server = createServer(app);


// Socket.IO setup
const io = new Server(server, {

    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }

});

setIO(io);


// Express middleware
app.use(cors());

app.use(express.json());
app.use(apiLimiter);

// Health check
app.get("/", (req, res) => {

    res.status(200).json({

        success: true,

        message: "Compressify Backend Running"

    });

});


// Video routes
app.use("/api/videos", videoRoutes);


// Handle undefined routes
app.use((req, res, next) => {

    res.status(404).json({

        success: false,

        message: `Route ${req.originalUrl} not found`

    });

});


// Global error handler (must be last)
app.use(errorMiddleware);


// Socket connection
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);

    });

});


// Start cleanup scheduler
cleanupFiles();


// Start server
const PORT = 5000;

server.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});