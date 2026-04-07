import { Meeting } from "../models/meeting.model.js"
import roomManager from "../sfu/roomManager.js"

export const registerChatSocket = (io, socket) => {
    socket.on("get-chat-data", async ({ roomID }, callback) => {
        try {
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            const room = roomManager.getRoom(normalizedRoomId)
            
            if (!room) {
                if (callback) callback({ error: "Room not found" })
                return
            }

            if (callback) callback({
                success: true,
                isChatEnabled: room.isChatEnabled,
                messages: room.messages || []
            })
        } catch (error) {
            console.error("get-chat-data error:", error)
            if (callback) callback({ error: "Failed to get chat data" })
        }
    })

    socket.on("toggle-chat", async ({ roomID, isEnabled }, callback) => {
        try {
            const user = socket.user
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            
            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })
            if (!meeting) {
                if (callback) callback({ error: "Meeting not found" })
                return
            }

            if (String(meeting.hostId) !== String(user._id)) {
                if (callback) callback({ error: "Unauthorized" })
                return
            }

            const room = roomManager.getRoom(normalizedRoomId)
            if (room) {
                room.isChatEnabled = isEnabled
                io.to(normalizedRoomId).emit("chat-status-changed", { isEnabled })
                if (callback) callback({ success: true })
            } else {
                if (callback) callback({ error: "Room not active" })
            }
        } catch (error) {
            console.error("toggle-chat error:", error)
            if (callback) callback({ error: "Failed to toggle chat" })
        }
    })

    socket.on("send-message", async ({ roomID, text }, callback) => {
        try {
            const user = socket.user
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            const room = roomManager.getRoom(normalizedRoomId)

            if (!room) {
                if (callback) callback({ error: "Room not found" })
                return
            }

            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })
            const isHost = meeting && String(meeting.hostId) === String(user._id)

            if (!room.isChatEnabled && !isHost) {
                if (callback) callback({ error: "Chat is disabled" })
                return
            }

            if (!text || !text.trim()) {
                if (callback) callback({ error: "Empty message" })
                return
            }

            const message = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                text: text.trim(),
                sender: {
                    id: user._id,
                    name: user.name || user.username || "Guest",
                },
                isHost: !!isHost,
                timestamp: new Date().toISOString()
            }

            if (!room.messages) {
                room.messages = []
            }
            room.messages.push(message)

            io.to(normalizedRoomId).emit("new-message", message)
            if (callback) callback({ success: true, message })

        } catch (error) {
            console.error("send-message error:", error)
            if (callback) callback({ error: "Failed to send message" })
        }
    })
}
