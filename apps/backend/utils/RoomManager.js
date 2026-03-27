import { getWorker } from "./workerPool.js"

const rooms = new Map();

const createRoom = async (roomID) => {

    if(rooms.has(roomID))   return rooms.get(roomID)

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

    rooms.set(roomID, room)

    return room;
}

export default createRoom