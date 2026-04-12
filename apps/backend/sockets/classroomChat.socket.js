import { Classroom } from "../models/classroom.model.js";

export const registerClassroomChatSocket = (io, socket) => {
    socket.on("join-classroom-chat", async ({ classroomId }, callback) => {
        try {
            const normalizedRoomId = String(classroomId || "").trim().toLowerCase();
            if (!normalizedRoomId) {
                if (callback) callback({ error: "Invalid classroom ID" });
                return;
            }

            const roomName = `classroom_${normalizedRoomId}`;
            socket.join(roomName);

            if (callback) callback({ success: true, room: roomName });
        } catch (error) {
            console.error("join-classroom-chat error:", error);
            if (callback) callback({ error: "Failed to join classroom chat" });
        }
    });

    socket.on("leave-classroom-chat", async ({ classroomId }, callback) => {
        try {
            const normalizedRoomId = String(classroomId || "").trim().toLowerCase();
            if (normalizedRoomId) {
                const roomName = `classroom_${normalizedRoomId}`;
                socket.leave(roomName);
            }
            if (callback) callback({ success: true });
        } catch (error) {
            console.error("leave-classroom-chat error:", error);
            if (callback) callback({ error: "Failed to leave classroom chat" });
        }
    });
};
