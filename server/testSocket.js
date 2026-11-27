import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
    console.log("Connected successfully!");
    console.log("Socket ID:", socket.id);
});

socket.on("compression-start", (data) => {
    console.log(data.message);
});

socket.on("compression-progress", (data) => {
    console.log("Progress:", data.percent + "%");
});

socket.on("compression-complete", (data) => {
    console.log("Compression completed!");
});

socket.on("compression-error", (data) => {
    console.log(data.message);
});