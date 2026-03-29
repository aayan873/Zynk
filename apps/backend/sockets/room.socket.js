import { Meeting } from "../models/meeting.model.js"

import roomManager from "../sfu/roomManager.js"

export const registerRoomSocket = (io, socket) => {
    socket.on("request-to-join", async ({ roomID }, callback) => {
        try {
            const user = socket.user

            if (!roomID) {
                return callback({ error: "roomID is required" })
            }

            const meeting = await Meeting.findOne({ roomId: roomID })

            if (!meeting) {
                return callback({ error: "Room not found" })
            }

            const hostId = meeting.hostId

            const peers = roomManager.getAllPeers(roomID)

            const hostPeer = peers.find(
                (p) => String(p.user._id) === String(hostId)
            )

            if (!hostPeer) {
                return callback({ error: "Host not in room" })
            }

            io.to(hostPeer.id).emit("user-requesting-join", {
                socketId: socket.id,
                user
            })

            callback({ success: true })

        } catch (error) {
            console.error("request-to-join error:", error)
            callback({ error: "request failed" })
        }
    })
    socket.on("host-decision", async ({ roomID, targetSocketId, decision }) => {
        try {
            const user = socket.user
            const meeting = await Meeting.findOne({ roomId: roomID })
            if (!meeting) {
                return
            }
            if (String(meeting.hostId) !== String(user._id)) {
                console.log("Unauthorized host-decision attempt")
                return
            }

            if (decision === "admit") {
                io.to(targetSocketId).emit("join-approved")
            } else {
                io.to(targetSocketId).emit("join-rejected")
            }

        } catch (error) {
            console.error("host-decision error:", error)
        }
    })
}
