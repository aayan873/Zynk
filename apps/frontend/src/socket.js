import { io } from "socket.io-client";

const token = localStorage.getItem("pos-token");

export const socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: {
        token,
    },
});