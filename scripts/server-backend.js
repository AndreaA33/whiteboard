import path from "path";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import config from "./config/config.js";
import { WhiteboardInfoBackendService } from "./services/WhiteboardInfoBackendService.js";
import healthRoutes from "./routes/health.js";
import whiteboardRoutes from "./routes/whiteboard.js";
import uploadRoutes from "./routes/upload.js";
import drawRoutes from "./routes/draw.js";
import { setupSocketHandlers } from "./socket/handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function startBackendServer(port) {
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
    setupSocketHandlers(io, DOMPurify);

    // Start server
    server.listen(port, () => {
        console.log("Server running on port:" + port);
    });
}