import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import videoRoutes from "./src/routes/videoRoutes.js";
import { setIO } from "./src/config/socket.js";

const app = express();

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

setIO(io);

app.use(cors());
app.use(express.json());

// Health check API
app.get("/", (req, res) => {
    res.status(200).send("Compressify Backend Running");
});

// Video routes
app.use("/api/videos", videoRoutes);

// Socket connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});