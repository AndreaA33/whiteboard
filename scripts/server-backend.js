import path from "path";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import config from "./config/config.js";
import WBInfoBackendService from "./services/WhiteboardInfoBackendService.js";
const WhiteboardInfoBackendService = new WBInfoBackendService();
import healthRoutes from "./routes/health.js";
import whiteboardRoutes from "./routes/whiteboard.js";
import uploadRoutes from "./routes/upload.js";
import drawRoutes from "./routes/draw.js";
import { socketHandlers } from "./socket/handlers.js"; // Ensure you're importing the object
import RedisService from "./services/RedisService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function startBackendServer(port) {
    // Check Redis connection before starting server
    try {
        const isConnected = await RedisService.isConnected();
        if (!isConnected) {
            console.error('Failed to connect to Redis. Please check your Redis configuration.');
            process.exit(1);
        }
    } catch (err) {
        console.error('Redis connection error:', err);
        process.exit(1);
    }

    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);

    const app = express();
    const server = http.Server(app);
    const io = new Server(server, { path: "/ws-api" });

    // Middleware to make accessToken available
    app.use((req, res, next) => {
        req.accessToken = config.backend.accessToken;
        req.io = io;
        next();
    });

    // Parse JSON bodies
    app.use(express.json());

    // Serve static files
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

    // Routes
    app.use('/api', healthRoutes);
    app.use('/api', whiteboardRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', drawRoutes);

    // Socket.io setup
    WhiteboardInfoBackendService.start(io);

    // Register socket event handlers individually
    io.on("connection", (socket) => {
        // Call individual handler methods, passing the appropriate arguments
        socket.on("drawing", (data) => {
            socketHandlers.handleDrawing(socket, data); // Call the handleDrawing method
        });

        socket.on("joinRoom", (roomId) => {
            socketHandlers.handleJoinRoom(socket, roomId); // Call the handleJoinRoom method
        });

        socket.on("leaveRoom", (roomId) => {
            socketHandlers.handleLeaveRoom(socket, roomId); // Call the handleLeaveRoom method
        });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received. Shutting down gracefully...');
        await RedisService.cleanup();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    // Start server
    server.listen(port, () => {
        console.log("Server running on port:" + port);
    });
}
