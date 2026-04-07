import express from "express";
import fs from "node:fs";
import http from "http";
import https from "https";
import { Server } from "socket.io";
import cors from "cors";
import socketAuth from "./middleware/socketAuth.js";
import { createWorkers } from "./sfu/workerPool.js";
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js'
import { registerSocketEvents } from "./sockets/sfu.socket.js";
import { registerRoomSocket } from "./sockets/room.socket.js";
import { registerChatSocket } from "./sockets/chat.socket.js";

export const startServer = async ({ port }) => {
    const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean);
    const corsOptions = {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
    };

    const app = express();
    const certFile = process.env.HTTPS_CERT_FILE;
    const keyFile = process.env.HTTPS_KEY_FILE;
    const useHttps = Boolean(certFile && keyFile);

    const server = useHttps
        ? https.createServer(
            {
                cert: fs.readFileSync(certFile),
                key: fs.readFileSync(keyFile),
            },
            app
        )
        : http.createServer(app);
        
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    app.use(cors(corsOptions));
    app.options("/{*corsPreflight}", cors(corsOptions));
    app.use(express.urlencoded({ limit: "40kb", extended: true }));
    app.use(express.json());

    io.use(socketAuth);

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // SFU events: join-room, create-send-transport, produce, consume, etc.
        registerSocketEvents(io, socket);

        // Room admission events: request-to-join, host-decision
        registerRoomSocket(io, socket);

        // Chat events
        registerChatSocket(io, socket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });


    await createWorkers();
    app.use('/api/auth', authRoutes)
    app.use('/api/rooms', roomRoutes)

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`Server listening on ${port}`);

    return { app, server, io };
}
