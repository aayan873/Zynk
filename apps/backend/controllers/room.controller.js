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

            const peer = roomManager.addPeer(roomID, socket)

            
        }


        const room = roomManager.createRoom(roomID)

        const peer = roomManager.addPeer(roomID, socket)

        socket.roomID = roomID

        socket.emit("router-rtp-capabilities", room.router.rtpCapabilities)
    })


}

//Disconnect a Room (Removal of Peer)
socket.on("disconnect", () => {
    if(socket.roomID){
        roomManager.removePeer(socket.roomID, socket.id)
    }
})