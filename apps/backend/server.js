import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import socketAuth from "./middleware/socketAuth.js";
import { createWorkers } from "./sfu/workerPool.js";
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js'
import { registerSocketEvents } from "./sockets/sfu.socket.js";
import { registerRoomSocket } from "./sockets/room.socket.js";

export const startServer = async ({ port }) => {

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.urlencoded({ limit: "40kb", extended: true }));
    app.use(express.json());
    app.use(cors({
        origin: ["http://localhost:5173",process.env.FRONTEND_URL],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }));
    
    io.use(socketAuth);

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // SFU events: join-room, create-send-transport, produce, consume, etc.
        registerSocketEvents(io, socket);

        // Room admission events: request-to-join, host-decision
        registerRoomSocket(io, socket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });


    await createWorkers();
    app.use('/api/auth', authRoutes)
    app.use('/api/rooms', roomRoutes)

    io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    });

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`Server listening on ${port}`);

    return { app, server, io };
}