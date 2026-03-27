import roomManager from "../sfu/roomManager.js"


export const registerSocketEvents = (io, socket) => {

    //Join or Create a Room
    socket.on("join-room", async ({ roomID }, callback) => {
        try{
            const user = socket.user    //! From Auth Middleware

            if(!roomID){
                return callback({ error: `roomID is required`})
            }

            const room = await roomManager.createRoom(roomID)

            const peer = roomManager.addPeer(roomID, socket, user)

            socket.roomID = roomID
            
            socket.join(roomID)

            const router = roomManager.getRouter(roomID)
            socket.emit("router-rtp-capabilities", room.router.rtpCapabilities)

            const producers = roomManager.getProducers(roomID, socket.id)
            socket.emit("existing-producers", producers)

            socket.to(roomID).emit("peer-joined", {
                peerID: socket.id,
                user
            })

            io.to(roomID).emit("participant-update", roomManager.getAllPeers(roomID))

            console.log(`Peer ${socket.id} joined room ${roomID}`)
            callback({ success: true})

        } catch(error) {
            console.error(`join-room error: ${error}`);
            callback({ error: "join failed"})
        }
    })
}

//Disconnect a Room (Removal of Peer)
socket.on("disconnect", () => {
    const roomID = socket.roomID
    if(!roomID) return

    roomManager.removePeer(roomID, socket.id)

    socket.to(roomID).emit("peer-left", { socketID: socket.id })
    io.to(roomID).emit("participant-update", roomManager.getAllPeers(roomID))

    console.log(`Peer ${socket.id} left room ${roomID}`)
})