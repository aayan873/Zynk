import { Meeting } from "../models/meeting.model.js"

import roomManager from "../sfu/roomManager.js"

export const registerRoomSocket = (io, socket) => {
    socket.on("request-to-join", async ({ roomID }, callback) => {
        try {
            const user = socket.user
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()

            if (!normalizedRoomId) {
                return callback({ error: "roomID is required" })
            }

            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })

            if (!meeting) {
                return callback({ error: "Room not found" })
            }

            if (meeting.blacklistedParticipants?.includes(String(user._id))) {
                return callback({ error: "You have been removed from this meeting." })
            }

            const hostId = meeting.hostId

            const peers = roomManager.getAllPeers(normalizedRoomId)

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
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })
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

    socket.on("grant-permission", async ({ roomID, targetSocketIds, type }) => {
        try {
            const user = socket.user
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })
            
            if (!meeting || String(meeting.hostId) !== String(user._id)) {
                console.log("Unauthorized grant-permission attempt")
                return
            }

            if (Array.isArray(targetSocketIds)) {
                targetSocketIds.forEach(targetId => {
                    io.to(targetId).emit("permission-granted", { type })
                })
            }
        } catch (error) {
            console.error("grant-permission error:", error)
        }
    })

    socket.on("revoke-permission", async ({ roomID, targetSocketIds, type }) => {
        try {
            const user = socket.user
            const normalizedRoomId = String(roomID || "").trim().toLowerCase()
            const meeting = await Meeting.findOne({ roomId: normalizedRoomId })
            
            if (!meeting || String(meeting.hostId) !== String(user._id)) {
                console.log("Unauthorized revoke-permission attempt")
                return
            }

            if (Array.isArray(targetSocketIds)) {
                targetSocketIds.forEach(targetId => {
                    io.to(targetId).emit("permission-revoked", { type })
                })
            }
        } catch (error) {
            console.error("revoke-permission error:", error)
        }
    })
}
