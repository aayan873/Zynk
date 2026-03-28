import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import socketAuth from "./middleware/socketAuth.js";
// import { createWorker } from "./sfu/workerPool.js";
import authRoutes from './routes/auth.routes.js';

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
    });


    // await createWorker();
    app.use('/api/auth', authRoutes);

    io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    });

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`Server listening on ${port}`);

    return { app, server, io };
}