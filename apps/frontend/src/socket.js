import { io } from "socket.io-client";

const token = localStorage.getItem("pos-token");

export const socket = io(process.env.BACKEND_URL, {
    auth: {
        token,
    },
});