import { Meeting } from '../models/meeting.model.js';
import crypto from 'crypto';

export const createRoom = async (req, res) => {
    try {
        const { title, type } = req.body;


        const newHostId = req.user._id;

        if (!title) {
            return res.status(400).json({ error: "Every meeting must have a title!" });
        }

        const rawUuid = crypto.randomUUID();
        const roomId = `${rawUuid.substring(0, 3)}-${rawUuid.substring(4, 8)}-${rawUuid.substring(9, 12)}`;
        const newMeeting = new Meeting({
            roomId: roomId,
            hostId: newHostId,
            type: type || 'MEET', // If they didn't provide a type, we assume it's just a MEET
            title: title,
            // participants will be empty initially, but the host is automatically the first participant!
            participants: [newHostId]
        });

        await newMeeting.save();

        res.status(201).json({
            message: "Room successfully created!",
            roomId: newMeeting.roomId,
            joinLink: `http://localhost:5173/room/${newMeeting.roomId}`,
            meetingDetails: newMeeting
        });

    } catch (error) {
        console.error(`Error creating sent transport ${error}`);
        callback({ error: error.message })
    }
})


socket.on("connect-send-transport", async({ dtlsParameters }, callback) => {
    try{
        const roomID = socket.roomID
        if(!roomID) return callback({ error: `RoomID Not Found in socket`})
        
        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
        
        const peer = room.peers.get(socket.id)
        if(!peer) return callback({ error: `Peer Not Found`});
        
        const transport = peer.sendTransport;
        if(!transport)  return callback({ error: `Send Transport Not Found`});
        
        await transport.connect({ dtlsParameters })
        
        console.log(`Send Transport Connected For ${socket.id}`)
        callback({ success: true })
        
    } catch(error) {
        console.error(`Error connecting send transport: ${error}`);
        callback({ error: error.message })
    }
})


socket.on("produce", async ({ kind, rtpParameters }, callback ) => {
    try{
        const roomID = socket.roomID
        if(!roomID) return callback({ error: `RoomID Not Found in socket`})
        
        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
        
        const peer = room.peers.get(socket.id)
        if(!peer || !peer.sendTransport) return callback({ error: `Send Transport Not Found`});
        
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
};

export const getHistory = async (req, res) => {
    try {
        const userId = req.user._id

        const meetings = await Meeting.find({
            $or: [
                { hostId: userId },
                { participants: userId }
            ]
        }).sort({ startedAt: -1 })
        res.status(200).json(meetings)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Failed to fetch history" })
    }
}

export const endRoom = async (req, res) => {
    try {
        const { roomId } = req.params
        const userId = req.user._id

        const meeting = await Meeting.findOne({ roomId: roomId })

        if (!meeting) {
            return res.status(404).json({ error: "Room not found" })
        }

        if (!meeting.hostId.equals(userId)) {
            return res.status(403).json({ error: "Only host can end meeting" })
        }
        meeting.endedAt = new Date()
        await meeting.save()
        res.status(200).json({ success: true })

    } catch (error) {
        console.error(`Error creating recv transport ${error}`);
        callback({ error: error.message })
    }
})



socket.on("connect-recv-transport", async({ transportID, dtlsParameters }, callback) => {
    try{
        const roomID = socket.roomID
        if(!roomID) return callback({ error: `RoomID Not Found in socket`})
        
        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
        
        const peer = room.peers.get(socket.id)
        if(!peer) return callback({ error: `Peer Not Found`});
        
        const transport = peer.recvTransports.get(transportID);
        if(!transport)  return callback({ error: `Recv Transport Not Found`});
        
        await transport.connect({ dtlsParameters })
        
        console.log(`Recv Transport Connected For ${socket.id}`)
        callback({ success: true })
        
    } catch(error) {
        console.error(`Error connecting recv transport: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("consume", async ({ producerID, transportID, rtpCapabilities }, callback) => {
    try{
        const roomID = socket.roomID
        if(!roomID) return callback({ error: `RoomID Not Found in socket`})

        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
            
        router = room.router
        const peer = room.peers.get(socket.id)
        if(!peer) return callback({ error: `Peer Not Found`});

        const canConsume = router.canConsume({
            producerID, rtpCapabilities
        })
        if(!canConsume){
            console.error(`Cannot consume this producer`)
            return callback({ error: "Cannot consume" })
        }

        const recvTransport = peer.recvTransports.get(transportID)
        if(!recvTransport){
            return callback({ error: "Recv Transport Not Found"})
        }

        const consumer = await recvTransport.consume({
            producerID,
            rtpCapabilities,
            paused: true
        })

        if(!peer.consumers){
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
    } catch(error) {
        console.error(`Consumer Error: ${error}`);
        callback({ error: error.message })
    }
})



socket.on("resume-consumer", async ({ consumerID }, callback) => {
    try{
        const roomID = socket.roomID
        if(!roomID) return callback({ error: `RoomID Not Found in socket`})

        const room = roomManager.getRoom(roomID)
        if(!room) return callback({ error: `Room Not Found`});
            
        const peer = room.peers.get(socket.id)
        if(!peer) return callback({ error: `Peer Not Found`});

        const consumer = peer.consumers.get(consumerID)
        if(!consumer) return callback({ error: `Consumer Not Found`});

        await consumer.resume()

        console.log(`Consumer Resumed: ${consumerID}`);
        callback({ success: true })
        
    } catch(error){
        console.error(`Resume Consumer Error: ${error}`);
        callback({ error: error.message })
    }
})