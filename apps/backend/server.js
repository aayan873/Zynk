import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
// import { createWorker } from "./utils/workerPool.js";

export const startServer = async ({app, port }) => {

    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.urlencoded({ limit: "40kb", extended: true }));
    app.use(express.json());
    app.use(cors({
         origin: ["http://localhost:5173",process.env.FRONTEND_URL],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
    ));

    // await createWorker();

    io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    });

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`Server listening on ${port}`);

    return {server, io };
}