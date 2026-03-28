import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const socketAuth = async (socket, next) => {
    try {
        const tokenFromAuth = socket.handshake?.auth?.token;
        const authHeader = socket.handshake?.headers?.authorization;

        const bearerToken =
        authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

        const token = tokenFromAuth || bearerToken;

        if (!token) {
            return next(new Error("Unauthorized: token missing"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // login() currently signs payload as { id, email }
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return next(new Error("Unauthorized: user not found"));
        }

        socket.user = user;
        next();
    } catch (err) {
        return next(new Error("Unauthorized: invalid token"));
    }
};

export default socketAuth;