import roomManager from "../sfu/roomManager.js"


//Join or Create a Room
socket.on("join-room", async ({ roomID }) => {
    const room = roomManager.createRoom(roomID)

    const peer = roomManager.addPeer(roomID, socket)

    socket.roomID = roomID

    socket.emit("router-rtp-capabilities", room.router.rtpCapabilities)
})

//Disconnect a Room (Removal of Peer)
socket.on("disconnect", () => {
    if(socket.roomID){
        roomManager.removePeer(socket.roomID, socket.id)
    }
})