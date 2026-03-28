import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { socket } from "../socket"
import { useSFU } from "../hooks/useSFU.js"
import { useAuth } from "../context/AuthContext.jsx"
import axios from "axios"

function StreamVideo({ stream, muted = false, className = "" }) {
    const ref = useRef(null)

    useEffect(() => {
        if (!ref.current) return
        ref.current.srcObject = stream || null
    }, [stream])

    return <video ref={ref} autoPlay playsInline muted={muted} className={className} />
}

function StreamAudio({ stream }) {
    const ref = useRef(null)

    useEffect(() => {
        if (!ref.current) return
        ref.current.srcObject = stream || null
    }, [stream])

    return <audio ref={ref} autoPlay playsInline />
}

export default function Room() {
    const { roomId } = useParams()
    const { localStream, remoteStreams, publishTrack, isConnected } = useSFU(socket, roomId)
    const { auth } = useAuth()
    const [room, setRoom] = useState(null)
    const [status, setStatus] = useState("idle")
    const [requests, setRequests] = useState([])
    const [published, setPublished] = useState(false)

    // Creating empty video element
    const videoRef = useRef(null)

    const currentUserId = auth?.user?._id || auth?.user?.id
    const isHost = room?.hostId === currentUserId


    // Preview local camera in lobby
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = localStream || null
        }
    }, [localStream])

    // Fetch room Details
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await axios.get(`/api/rooms/${roomId}`)
                setRoom(res.data)
            } catch (err) {
                console.error(err)
            }
        }
        fetchRoom()
    }, [roomId])


    // Recieve user-requesting-join, from the user socket id and user details
    useEffect(() => {
        if (!isHost) return
        socket.on("user-requesting-join", ({ socketId, user }) => {
            setRequests(prev => {
                if (prev.find(r => r.socketId === socketId)) return prev
                return [...prev, { socketId, user }]
            })
        })
        return () => socket.off("user-requesting-join")
    }, [isHost])


    // Recieve join-approved, join-rejected from the host
    useEffect(() => {
        socket.on("join-approved", () => {
            setStatus("joined")
            socket.emit("join-room", { roomID: roomId }, (res) => {
                if (res?.error) console.log(res.error)
            })
        })
        socket.on("join-rejected", () => {
            alert("The host denied your entry.")
            setStatus("idle")
        })
        return () => {
            socket.off("join-approved")
            socket.off("join-rejected")
        }
    }, [roomId])


    useEffect(() => {
        if (status !== "joined" || !isConnected || !localStream) return;
        if (published) return;

        localStream.getTracks().forEach((track) => {
            const kind = track.kind; // "audio" | "video"
            publishTrack(track, kind, "camera");
        });

        setPublished(true)
    }, [status, isConnected, localStream, published, publishTrack]);

    useEffect(() => {
        if (status !== "joined") setPublished(false)
    }, [status])



    // Emit request-to-join to the host
    const handleJoin = () => {
        setStatus("waiting")
        socket.emit("request-to-join", { roomID: roomId }, (res) => {
            if (res?.error) {
                console.log(res.error)
                setStatus("idle")
            }
        })
    }

    // Emit host-decision to the host
    const handleDecision = (targetSocketId, decision) => {
        socket.emit("host-decision", { roomID: roomId, targetSocketId, decision })
        setRequests(prev => prev.filter(req => req.socketId !== targetSocketId))
    }

    const remoteVideoTiles = Array.from(remoteStreams.entries()).filter(([, data]) => data.kind === "video")
    const remoteAudioTracks = Array.from(remoteStreams.entries()).filter(([, data]) => data.kind === "audio")

    if (!room) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Room...</div>

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col pt-12 items-center">

            {/* Standard Header */}
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold tracking-tight">{room.title}</h2>
                <span className="inline-block mt-3 px-3 py-1 bg-gray-800 text-gray-300 text-sm font-medium rounded-full border border-gray-700">
                    {room.type}
                </span>
            </div>

            {/* STATUS: IDLE (The Lobby Screen) */}
            {status === "idle" && (
                <div className="flex flex-col items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl max-w-3xl w-full mx-4">
                    {/* The Camera Mirror */}
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative border border-gray-800 mb-6">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        /* scale-x-[-1] creates a "Mirror" effect so it feels natural! */
                        />
                    </div>

                    <button onClick={handleJoin} className="bg-blue-600 hover:bg-blue-500 text-lg font-bold py-4 px-12 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20">
                        Ask to Join
                    </button>
                    <p className="text-gray-500 text-sm mt-4">Make sure your hair looks good!</p>
                </div>
            )}

            {/* STATUS: WAITING (The Waiting Room Spinner) */}
            {status === "waiting" && (
                <div className="flex flex-col items-center mt-20">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-2xl font-semibold">Waiting for the host to let you in...</h3>
                    <p className="text-gray-500 mt-2">They know you're here. Hang tight!</p>
                </div>
            )}

            {/* STATUS: JOINED (Currently empty, Module 4 will build the actual call here!) */}
            {status === "joined" && (
                <div className="w-full mt-4 shadow-2xl max-w-6xl px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="aspect-video bg-black">
                                <StreamVideo stream={localStream} muted className="w-full h-full object-cover transform scale-x-[-1]" />
                            </div>
                            <div className="px-3 py-2 text-sm text-gray-300">You</div>
                        </div>

                        {remoteVideoTiles.map(([consumerId, data]) => (
                            <div key={consumerId} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="aspect-video bg-black">
                                    <StreamVideo stream={data.stream} className="w-full h-full object-cover" />
                                </div>
                                <div className="px-3 py-2 text-sm text-gray-300">Participant {data.peerID?.slice(0, 6) || "guest"}</div>
                            </div>
                        ))}
                    </div>

                    {remoteVideoTiles.length === 0 && (
                        <p className="text-center text-gray-400 mt-6">Waiting for other participants to publish video...</p>
                    )}

                    {remoteAudioTracks.map(([consumerId, data]) => (
                        <StreamAudio key={consumerId} stream={data.stream} />
                    ))}
                </div>
            )}

            {/* HOST ADMISSION PANEL (Only shows for the Host) */}
            {isHost && requests.length > 0 && (
                <div className="fixed bottom-8 right-8 bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-6 w-96 transform transition-all">
                    <h3 className="text-lg font-bold border-b border-gray-800 pb-3 mb-4">🚪 Someone is knocking!</h3>
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div key={req.socketId} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                <span className="font-medium text-gray-200 truncate">{req.user?.name || "Guest User"}</span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleDecision(req.socketId, "reject")} className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md text-sm font-semibold transition">
                                        Deny
                                    </button>
                                    <button onClick={() => handleDecision(req.socketId, "admit")} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold shadow-sm transition">
                                        Admit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}
