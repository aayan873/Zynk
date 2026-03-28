import { error } from "console"
import roomManager from "../sfu/roomManager.js"
import { Meeting } from "../models/Meeting.model.js"

export const registerSocketEvents = (io, socket) => {

    //Join or Create a Room
    socket.on("join-room", async ({ roomID }, callback) => {
        try {
            const user = socket.user    //! From Auth Middleware
            if (!roomID) { return callback({ error: `roomID is required` }) }

            const meeting = await Meeting.findOne({ roomId: roomID })

            if (!meeting) { return callback({ error: "Room does not exist" }) }

            if (!meeting.participants.includes(user.userId)) {
                meeting.participants.push(user.userId)
                await meeting.save()
            }

            const room = await roomManager.createRoom(roomID)
            const peer = roomManager.addPeer(roomID, socket, user)

            socket.roomID = roomID
            socket.join(roomID)

            const router = roomManager.getRouter(roomID)
            socket.emit("router-rtp-capabilities", router.rtpCapabilities)

            const producers = roomManager.getProducers(roomID, socket.id)
            socket.emit("existing-producers", producers)

            socket.to(roomID).emit("peer-joined", {
                peerID: socket.id,
                user
            })

            io.to(roomID).emit("participant-update", roomManager.getAllPeers(roomID))

            console.log(`Peer ${socket.id} joined room ${roomID}`)
            callback({ success: true })

        } catch (error) {
            console.error(`join-room error: ${error}`);
            callback({ error: "join failed" })
        }
    })
}

//Disconnect a Room (Removal of Peer)
socket.on("disconnect", async () => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        peer.producers.forEach((p) => {
            try {
                p.close()
            } catch (error) {
                console.error(`Produce close error: ${error}`);
            }
        })

        peer.consumers.forEach((c) => {
            try {
                c.close()
            } catch (error) {
                console.error(`Consumer close error: ${error}`);
            }
        })

        peer.transports.forEach((t) => {
            try {
                t.close()
            } catch (error) {
                console.error(`Transport close error: ${error}`);
            }
        })

        await roomManager.removePeer(roomID, socket.id)

        socket.to(roomID).emit("peer-left", { socketID: socket.id })

        io.to(roomID).emit("participant-update", roomManager.getAllPeers(roomID))

        console.log(`Peer ${socket.id} disconnected from ${roomID}`);

    } catch (error) {
        console.error(`Disconnect Error: ${error}`);
    }
})


socket.on("create-send-transport", async (callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        router = room.router
        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        //Create WebRTC Transport
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

        //Send Transport in Peer
        peer.sendTransport = transport

        //Handle Transport Lifecycle
        transport.on("dtlsstatechange", (state) => {
            if (state === "closed") {
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


socket.on("connect-send-transport", async ({ dtlsParameters }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const transport = peer.sendTransport;
        if (!transport) return callback({ error: `Send Transport Not Found` });

        await transport.connect({ dtlsParameters })

        console.log(`Send Transport Connected For ${socket.id}`)
        callback({ success: true })

    } catch (error) {
        console.error(`Error connecting send transport: ${error}`);
        callback({ error: error.message })
    }
})


socket.on("produce", async ({ kind, rtpParameters }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer || !peer.sendTransport) return callback({ error: `Send Transport Not Found` });

        //Create Producer
        const producer = await peer.sendTransport.produce({
            kind, rtpParameters
        })

        //Store Producer
        peer.producers.set(producer.id, producer)

        console.log(`Prodeucer created: ${producer.id} ${kind}`);

        //Handle Producer Close
        producer.on("transportclose", () => {
            console.log(`Producer Transport Closed`);
            producer.close()
            peer.producers.delete(producer.id)
        })

        producer.on("close", () => {
            console.log("Producer Closed")
            peer.producers.delete(producer.id)
        })

        //Notify other peers
        socket.to(roomID).emit("new-producer", {
            producerID: producer.id,
            peerID: socket.id,
            kind,
        })

        //Send Producer ID back to client
        callback({
            id: producer.id,
        })
    } catch (error) {
        console.error(`Producer Error: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("resume-producer", async ({ producerID }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const producer = peer.producers.get(producerID)
        if (!producer) return callback({ error: `Producer Not Found` });

        await producer.resume()

        socket.to(roomID).emit("producer-resumed", {
            producerID, peerID: socket.id
        })

        console.log(`Producer Resumed: ${producerID}`);
        callback({ success: true })

    } catch (error) {
        console.error(`Resume Producer Error: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("pause-producer", async ({ producerID }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const producer = peer.producers.get(producerID)
        if (!producer) return callback({ error: `Producer Not Found` });

        await producer.pause()

        socket.to(roomID).emit("producer-paused", {
            producerID, peerID: socket.id
        })

        console.log(`Producer Paused: ${producerID}`);
        callback({ success: true })

    } catch (error) {
        console.error(`Pause Producer Error: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("create-recv-transport", async () => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        router = room.router
        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        //Create WebRTC Transport
        const transport = await router.createWebRtcTransport({
            listenIPs: [
                {
                    ip: "0.0.0.0",
                    announcedIp: process.env.ANNOUNCEDIP_IP || null     //! Add the public IP (AWS, etc) while deploying
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        })

        if (!peer.recvTransports) {
            peer.recvTransports = new Map()
        }
        peer.recvTransports.set(transport.id, transport)

        //Handle Transport Lifecycle
        transport.on("dtlsstatechange", (state) => {
            if (state === "closed") {
                console.log("Send Transport Closed")
                transport.close()
            }
        })

        transport.on("close", () => {
            console.log("Send transport fully closed");
            peer.recvTransports.delete(transport.id)
        })

        callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        })

    } catch (error) {
        console.error(`Error creating recv transport ${error}`);
        callback({ error: error.message })
    }
})



socket.on("connect-recv-transport", async ({ transportID, dtlsParameters }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const transport = peer.recvTransports.get(transportID);
        if (!transport) return callback({ error: `Recv Transport Not Found` });

        await transport.connect({ dtlsParameters })

        console.log(`Recv Transport Connected For ${socket.id}`)
        callback({ success: true })

    } catch (error) {
        console.error(`Error connecting recv transport: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("consume", async ({ producerID, transportID, rtpCapabilities }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        router = room.router
        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const canConsume = router.canConsume({
            producerID, rtpCapabilities
        })
        if (!canConsume) {
            console.error(`Cannot consume this producer`)
            return callback({ error: "Cannot consume" })
        }

        const recvTransport = peer.recvTransports.get(transportID)
        if (!recvTransport) {
            return callback({ error: "Recv Transport Not Found" })
        }

        const consumer = await recvTransport.consume({
            producerID,
            rtpCapabilities,
            paused: true
        })

        if (!peer.consumers) {
            peer.consumers = new Map()
        }
        peer.consumers.set(consumer.id, consumer)

        consumer.on("transportclose", () => {
            consumer.close()
            peer.consumers.delete(consumer.id)
        })

        consumer.on("producerclose", () => {
            consumer.close()
            peer.consumers.delete(consumer.id)

            socket.emit("producer-closed", { producerID })
        })

        callback({
            id: consumer.id,
            producerID,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        })
    } catch (error) {
        console.error(`Consumer Error: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("resume-consumer", async ({ consumerID }, callback) => {
    try {
        const roomID = socket.roomID
        if (!roomID) return callback({ error: `RoomID Not Found in socket` })

        const room = roomManager.getRoom(roomID)
        if (!room) return callback({ error: `Room Not Found` });

        const peer = room.peers.get(socket.id)
        if (!peer) return callback({ error: `Peer Not Found` });

        const consumer = peer.consumers.get(consumerID)
        if (!consumer) return callback({ error: `Consumer Not Found` });

        await consumer.resume()

        console.log(`Consumer Resumed: ${consumerID}`);
        callback({ success: true })

    } catch (error) {
        console.error(`Resume Consumer Error: ${error}`);
        callback({ error: error.message })
    }
})