import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { socket } from "../socket"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import { useSFU } from "../hooks/useSFU"
import VideoTile from "./VideoTile"

export default function Room() {
    const { roomId } = useParams()
    const { localStream, remoteStreams, publishTrack, isConnected, isReady, isTransportReady } = useSFU(socket, roomId)
    const [room, setRoom] = useState(null)
    const [status, setStatus] = useState("idle")
    const [requests, setRequests] = useState([])
    const { auth } = useAuth()

    // Creating empty video element
    const videoRef = useRef(null)
    const hasJoinedRef = useRef(false)
    const publishedTrackIdsRef = useRef(new Set())

    const currentUserId = auth?.user?._id || auth?.user?.id
    const isHost = room?.hostId === currentUserId


    // When idle get camera and plug to video elements
    useEffect(() => {
        if (status === "idle") {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                    }
                })
                .catch(err => console.error("Could not access camera:", err))
        }
    }, [status])

    // Fetch room Details
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await axios.get(`/api/rooms/${roomId}`, {
                    headers: {
                        Authorization: `Bearer ${auth?.token}`
                    }
                })
                setRoom(res.data)
            } catch (err) {
                console.error(err)
            }
        }
        fetchRoom()
    }, [roomId])

    useEffect(() => {
        if (!room || !auth?.user || !isReady) return

        if (isHost) {
            if (hasJoinedRef.current) return

            hasJoinedRef.current = true
            setStatus("joined")
            socket.emit("join-room", { roomID: roomId }, (res) => {
                if (res?.error) {
                    console.error(res.error)
                    hasJoinedRef.current = false
                    setStatus("idle")
                }
            })
        }
    }, [room, auth, isReady, isHost, roomId])

    useEffect(() => {
        if (status !== "joined" || !isConnected || !localStream || !isTransportReady ) return

        localStream.getTracks().forEach((track) => {
            if (publishedTrackIdsRef.current.has(track.id)) return

            publishedTrackIdsRef.current.add(track.id)
            publishTrack(track, track.kind, "camera")
        })
    }, [status, isConnected, localStream, isTransportReady, publishTrack])


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
            if (hasJoinedRef.current) return

            hasJoinedRef.current = true
            socket.emit("join-room", { roomID: roomId }, (res) => {
                if (res?.error) {
                    console.log(res.error)
                    hasJoinedRef.current = false
                    setStatus("idle")
                    return
                }
                setStatus("joined")
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
        return () => {
            hasJoinedRef.current = false
            publishedTrackIdsRef.current.clear()
        }
    }, [])

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
                <div className="w-full max-w-6xl mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {localStream && (
                            <VideoTile stream={localStream} isLocal />
                        )}

                        {Array.from(remoteStreams.entries()).map(([id, data]) => (
                            <VideoTile
                                key={id}
                                stream={data.stream}
                                peerId={data.peerID}
                            />
                        ))}
                    </div>
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
