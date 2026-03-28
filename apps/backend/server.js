import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createWorker } from "./sfu/workerPool.js";

export const startServer = async ({ port }) => {

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.urlencoded({ limit: "40kb", extended: true }));
    app.use(express.json());
    app.use(cors());

    await createWorker();

    io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    });

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`Server listening on ${port}`);

    return { app, server, io };
}