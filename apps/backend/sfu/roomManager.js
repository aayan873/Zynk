import * as mediasoup from mediasoup
import { getWorker } from "./workerPool.js"

class RoomManager{
    constructor() {
        this.rooms = new Map()
    }

    async createRoom(roomID, type="MEET") {

        if(this.rooms.has(roomID))   return this.rooms.get(roomID)

        const worker = getWorker()
        
        const router = await worker.createRouter({
            mediaCodecs: [
                {
                    kind: "audio",
                    mimeType: "audio/opus",
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: "video",
                    mimeType: "video/VP8",
                    clockRate: 90000,
                },
            ],
        })

        const room = {
            router,
            peers: new Map(),
        }

        this.rooms.set(roomID, room)

        console.log(`Room Created: ${roomID}`)
        return room;
    }


    getRoom(roomID){
        return this.rooms.get(roomID)
    }


    async deleteRoom(roomID){
        const room = this.rooms.get(roomID)
        if(!room)   return

        //Close All Peer Connections
        for( const peer of room.peers.values()){
            this._closePeer(peer)
        }

        //Close Router
        await room.router.close()
        this.rooms.delete(roomID)

        console.log(`Room Deleted: ${roomID}`)
    }


    addPeer(roomID, socket, user){
        const room = this.rooms.get(roomID)
        if(!room) throw new Error(`Room Does Not Exist`)

        const peer = {
            id: socket.id,
            socket,
            user,
            sendTransport: null,
            recvTransports: new Map(),
            producers: new Map(),
            consumers: new Map(),

            joinedAt: Date.now(),
            permission: {
                canVideo: true,
                canAudio: true,
                canChat: true
            }
        }

        room.peers.set(socket.id, peer)

        return peer
    }


    async removePeer(roomID, socketID){
        const room = this.rooms.get(roomID)
        if(!room) return

        const peer = room.peers.get(socketID)
        if(!peer)   return

        this._closePeer(peer)
        room.peers.delete(socketID)

        if(room.peers.size === 0){
            await this.deleteRoom(roomID)
        }
    }


    getPeer(roomID, socketID){
        const room = this.rooms.get(roomID)
        if(!room)   return null

        return room.peers.get(socketID)
    }


    getAllPeers(roomID){
        const room = this.rooms.get(roomID)
        if(!room)   return []

        return Array.from(room.peers.values())
    }


    _closePeer(peer){
        try{
            peer.producers.forEach((p) => p.close())
            peer.consumers.forEach((c) => c.close())
            peer.recvTransports.forEach((rT) => rT.close())

            if(peer.sendTransport){
                peer.sendTransport.close()
            }
        } catch(error){
            console.error(`Error Closing Peer: ${error}`)
        }
    }


    getProducers(roomID, excludeSocketID){
        const room = this.rooms.get(roomID)
        if(!room)   return []

        const producers = []

        for(const [peerID, peer] of room.peers){
            if(peerID === excludeSocketID)  continue;
            peer.producers.forEach((p) => {
                producers.push({
                    producerID: p.id,
                    peerID,
                    kind: p.kind
                })
            })
        }

        return producers
    }


    getRouter(roomID){
        const room = this.rooms.get(roomID)
        if(!room)   return null

        return room.router
    }
}

export default new RoomManager()