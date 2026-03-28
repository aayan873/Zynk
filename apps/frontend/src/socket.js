import { io } from "socket.io-client";

const token = localStorage.getItem("pos-token");
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export const socket = io(backendUrl, {
    auth: {
        token,
    },
});
