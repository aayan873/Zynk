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


socket.on("create-send-transport", async (callback) => {
    try{
        const roomID = socket.roomID
        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
            
        router = room.router
        const peer = room.peer.get(socket.id)
        if(!peer) return callback({ error: `Peer Not Found`});
        
        const transport = await router.createWebRtcTransport({
            listenIPs: [
                {
                    ip: "0.0.0.0",
                    announcedIp: process.env.ANNOUNCEDIP_IP || null     //! Add the public IP (AWS, etc) while deploying
                },
            ],
            enableUdp: true,
            enableTcp: true,
            PreferUdp: true,
        })

        peer.sendTransport = transport

        transport.on("dtlsstatechange", (state) => {
            if( state === "closed"){
                console.log("Send Transport Closed")
                transport.close()
            }
        })

        transport.on("close", () => {
            console.log("Send transport fully closed");
        })

        callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        })
        
    } catch (error) {
        console.error(`Error creating sent transport ${error}`);
        callback({ error: error.message })
    }
})