import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { socket } from "../socket"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import { useSFU } from "../hooks/useSFU"
import VideoTile from "./VideoTile"
import toast from "react-hot-toast"
import { Mic, MicOff, Video, VideoOff, Hand, Users, DoorOpen, ScreenShare, ScreenShareOff } from "lucide-react"

export default function Room() {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const { localStream, localScreenStream, activeScreenSharePeerId, startScreenShare, stopScreenShare, remoteStreams, participantStates, publishTrack, toggleProducer, isConnected, isReady, isTransportReady, leaveRoom } = useSFU(socket, roomId)
    const [room, setRoom] = useState(null)
    const [status, setStatus] = useState("idle")
    const [requests, setRequests] = useState([])
    const { auth } = useAuth()
    const [isMicOn, setIsMicOn] = useState(true)
    const [isVideoOn, setIsVideoOn] = useState(true)
    const [hostGrantedMic, setHostGrantedMic] = useState(false)
    const [hostGrantedVideo, setHostGrantedVideo] = useState(false)
    const [hostGrantedScreen, setHostGrantedScreen] = useState(false)
    const [participants, setParticipants] = useState([])
    const [selectedParticipants, setSelectedParticipants] = useState([])
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isHandRaised, setIsHandRaised] = useState(false)

    // Creating empty video element
    const videoRef = useRef(null)
    const hasJoinedRef = useRef(false)
    const publishedTrackIdsRef = useRef(new Set())

    const currentUserId = auth?.user?._id || auth?.user?.id
    const isHost = room?.hostId === currentUserId
    const isReturningParticipant = room?.participants?.includes(currentUserId)


    // When idle plug localStream to video elements
    useEffect(() => {
        if (status === "idle" && localStream && videoRef.current) {
            videoRef.current.srcObject = localStream
        }
    }, [status, localStream])

    // Global Autoplay Unlocker: Resolves any strict browser autoplay issues frictionlessly
    useEffect(() => {
        const unlockAudioAndVideos = () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            if (AudioContext) {
                const ctx = new AudioContext()
                ctx.resume()
            }
            
            // Re-ignite any stalled video elements
            const videos = document.querySelectorAll("video")
            videos.forEach(v => {
                if (!v.muted) v.play().catch(() => {})
            })
            
            document.removeEventListener("click", unlockAudioAndVideos)
        }
        document.addEventListener("click", unlockAudioAndVideos)
        return () => document.removeEventListener("click", unlockAudioAndVideos)
    }, [])

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
        if (room) {
            if (isHost) {
                setHostGrantedMic(true)
                setHostGrantedVideo(true)
                setHostGrantedScreen(true)
                setIsMicOn(true)
                setIsVideoOn(true)
            } else {
                setHostGrantedMic(false)
                setHostGrantedVideo(false)
                setHostGrantedScreen(false)
                setIsMicOn(false)
                setIsVideoOn(false)
            }
        }
    }, [room, isHost])

    useEffect(() => {
        if (!room || !auth?.user || !isReady) return

        if (isHost || isReturningParticipant) {
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
    }, [room, auth, isReady, isHost, isReturningParticipant, roomId])

    useEffect(() => {
        if (status !== "joined" || !isConnected || !localStream || !isTransportReady ) return

        localStream.getTracks().forEach((track) => {
            if (publishedTrackIdsRef.current.has(track.id)) return

            if (!isHost) {
                track.enabled = false
            }

            publishedTrackIdsRef.current.add(track.id)
            publishTrack(track, track.kind, track.kind === "audio" ? "mic" : "camera").then(() => {
                if (!isHost) {
                    toggleProducer(track.kind, false)
                }
            })
        })
    }, [status, isConnected, localStream, isTransportReady, publishTrack, isHost, toggleProducer])


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
        const handlePermissionGranted = ({ type }) => {
            if (type === "mic") {
                setHostGrantedMic(true)
                alert("Host has granted you permission to unmute your mic.")
            } else if (type === "video") {
                setHostGrantedVideo(true)
                alert("Host has granted you permission to start your video.")
            } else if (type === "screen") {
                setHostGrantedScreen(true)
                alert("Host has granted you permission to share your screen.")
            }
        }

        const handlePermissionRevoked = ({ type }) => {
            if (type === "mic") {
                setHostGrantedMic(false)
                setIsMicOn(false)
                if (localStream) {
                    localStream.getAudioTracks().forEach(track => track.enabled = false)
                }
                toggleProducer("audio", false)
                alert("Host has revoked your permission to use your mic.")
            } else if (type === "video") {
                setHostGrantedVideo(false)
                setIsVideoOn(false)
                if (localStream) {
                    localStream.getVideoTracks().forEach(track => track.enabled = false)
                }
                toggleProducer("video", false)
                alert("Host has revoked your permission to use your video.")
            } else if (type === "screen") {
                setHostGrantedScreen(false)
                if (localScreenStream) {
                    stopScreenShare()
                }
                alert("Host has revoked your permission to share your screen.")
            }
        }

        socket.on("permission-granted", handlePermissionGranted)
        socket.on("permission-revoked", handlePermissionRevoked)

        return () => {
            socket.off("permission-granted", handlePermissionGranted)
            socket.off("permission-revoked", handlePermissionRevoked)
        }
    }, [localStream, toggleProducer])

    useEffect(() => {
        const handleParticipantUpdate = (list) => {
            setParticipants(list)
        }
        const handleHandToggled = ({ socketId, isRaised, user }) => {
            if (isRaised) {
                toast(`${user?.name || "Someone"} raised their hand`, { icon: <Hand className="w-4 h-4 text-yellow-500" /> })
            }
        }
        socket.on("participant-update", handleParticipantUpdate)
        socket.on("hand-toggled", handleHandToggled)
        return () => {
            socket.off("participant-update", handleParticipantUpdate)
            socket.off("hand-toggled", handleHandToggled)
        }
    }, [])

    useEffect(() => {
        return () => {
            hasJoinedRef.current = false
            publishedTrackIdsRef.current.clear()
        }
    }, [])

    useEffect(() => {
        const onMeetingEnded = () => {
            alert("The host has ended the meeting.")
            leaveRoom()
            navigate("/home")
        }
        
        socket.on("meeting-ended", onMeetingEnded)
        return () => socket.off("meeting-ended", onMeetingEnded)
    }, [navigate, leaveRoom])

    const handleDisconnect = () => {
        if (isHost) {
            socket.emit("end-meeting", (res) => {
                if (res?.error) {
                    console.error("End meeting error:", res.error)
                }
                navigate("/home")
            })
        } else {
            leaveRoom()
            navigate("/home")
        }
    }

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

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMicOn
            })
            toggleProducer("audio", !isMicOn)
            setIsMicOn(!isMicOn)
        }
    }

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoOn
            })
            toggleProducer("video", !isVideoOn)
            setIsVideoOn(!isVideoOn)
        }
    }

    const toggleHand = () => {
        const newStatus = !isHandRaised
        setIsHandRaised(newStatus)
        socket.emit("toggle-hand", { isRaised: newStatus })
    }

    const handleBulkPermission = (type, action) => {
        if (selectedParticipants.length === 0) return
        socket.emit(action === "grant" ? "grant-permission" : "revoke-permission", {
            roomID: roomId,
            targetSocketIds: selectedParticipants,
            type
        })
        setSelectedParticipants([])
    }

    const handleSelectParticipant = (id) => {
        setSelectedParticipants(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        )
    }

    // Emit host-decision to the host
    const handleDecision = (targetSocketId, decision) => {
        socket.emit("host-decision", { roomID: roomId, targetSocketId, decision })
        setRequests(prev => prev.filter(req => req.socketId !== targetSocketId))
    }

    if (!room) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Room...</div>

    // Layout Logic
    let mainStreamObj = null;
    let otherStreamsObjs = [];

    if (status === "joined") {
        const localStreamObj = {
            stream: localStream,
            peerID: "local",
            isLocal: true,
            userName: auth?.user?.name || "You"
        }

        if (isHost) {
            mainStreamObj = localStreamObj;
        } else {
            otherStreamsObjs.push(localStreamObj);
        }

        Array.from(remoteStreams.entries()).forEach(([id, data]) => {
            const participantInfo = participants.find(p => p.id === id);
            const name = participantInfo?.user?.name || participantInfo?.user?._id?.slice(-6) || "Guest";

            if (data.stream) {
                const streamData = {
                    stream: data.stream,
                    peerID: id,
                    isLocal: false,
                    userName: name,
                }
                
                if (participantInfo && participantInfo.user?._id === room?.hostId && !isHost) {
                    if (mainStreamObj) {
                        otherStreamsObjs.push(mainStreamObj);
                    }
                    mainStreamObj = streamData;
                } else {
                    otherStreamsObjs.push(streamData);
                }
            }
        })

        // Determine active screen share
        let screenShareObj = null;
        if (activeScreenSharePeerId === "local" && localScreenStream) {
            screenShareObj = {
                stream: localScreenStream,
                peerID: "local_screen",
                isLocal: true,
                userName: `${auth?.user?.name || "You"} (Screen)`
            }
        } else if (activeScreenSharePeerId && activeScreenSharePeerId !== "local") {
            const data = remoteStreams.get(activeScreenSharePeerId)
            if (data && data.screenStream) {
                const pInfo = participants.find(p => p.id === activeScreenSharePeerId);
                const name = pInfo?.user?.name || pInfo?.user?._id?.slice(-6) || "Guest";
                screenShareObj = {
                    stream: data.screenStream,
                    peerID: `${activeScreenSharePeerId}_screen`,
                    isLocal: false,
                    userName: `${name} (Screen)`
                }
            }
        }

        if (screenShareObj) {
            if (mainStreamObj) {
                otherStreamsObjs.unshift(mainStreamObj);
            }
            mainStreamObj = screenShareObj;
        } else if (!mainStreamObj && otherStreamsObjs.length > 0) {
            mainStreamObj = otherStreamsObjs[0];
            otherStreamsObjs = otherStreamsObjs.slice(1);
        } else if (!mainStreamObj && localStream) {
            mainStreamObj = localStreamObj;
        }
    }

    return (
        <div className={`min-h-screen bg-gray-950 text-white flex flex-col ${status === "joined" ? "h-screen overflow-hidden" : "pt-12 items-center"}`}>

            {/* Standard Header only in idle/waiting */}
            {status !== "joined" && (
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold tracking-tight">{room.title}</h2>
                    <span className="inline-block mt-3 px-3 py-1 bg-gray-800 text-gray-300 text-sm font-medium rounded-full border border-gray-700">
                        {room.type}
                    </span>
                </div>
            )}

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

            {/* STATUS: JOINED */}
            {status === "joined" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">
                        {/* Video Area */}
                        <div className="flex-1 relative bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-800">
                            {mainStreamObj && (
                                <VideoTile 
                                    stream={mainStreamObj.stream} 
                                    isLocal={mainStreamObj.isLocal} 
                                    isScreen={mainStreamObj.isScreen}
                                    peerId={mainStreamObj.peerID} 
                                    isMain={true}
                                    userName={mainStreamObj.userName}
                                />
                            )}

                            {/* PIP grid for other users */}
                            {otherStreamsObjs.length > 0 && (
                                <div className="absolute bottom-4 right-4 flex gap-2 overflow-x-auto max-w-full pb-2 z-10 px-2 py-2 bg-black/30 rounded-xl backdrop-blur-sm">
                                    {otherStreamsObjs.map((obj) => (
                                        <VideoTile
                                            key={obj.peerID}
                                            stream={obj.stream}
                                            isLocal={obj.isLocal}
                                            isScreen={obj.isScreen}
                                            peerId={obj.peerID}
                                            isMain={false}
                                            userName={obj.userName}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* HOST ADMISSION PANEL overlay */}
                            {isHost && requests.length > 0 && (
                                <div className="absolute top-4 left-4 bg-gray-900/90 border border-gray-700 shadow-2xl rounded-2xl p-6 w-96 z-20 backdrop-blur-md">
                                    <h3 className="flex items-center gap-2 text-lg font-bold border-b border-gray-800 pb-3 mb-4"><DoorOpen className="w-5 h-5 text-gray-400" /> Someone is knocking!</h3>
                                    <div className="space-y-4 max-h-60 overflow-y-auto">
                                        {requests.map((req) => (
                                            <div key={req.socketId} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                                <span className="font-medium text-gray-200 truncate">{req.user?.name || req.user?._id?.slice(-6) || "Guest User"}</span>
                                                <div className="flex space-x-2 shrink-0">
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

                        {/* Sidebar */}
                        {isSidebarOpen && (
                            <div className="w-80 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden shrink-0 shadow-lg">
                                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                    <h3 className="text-lg font-bold">People</h3>
                                    <span className="text-xs font-semibold bg-gray-800 px-2 py-1 rounded-full text-gray-300">
                                        {participants.length}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {participants.map((p) => {
                                        const isMe = p.id === socket.id;
                                        const name = isMe ? `${p.user?.name || "You"} (You)` : (p.user?.name || p.user?._id?.slice(-6) || "Guest");
                                        const pState = participantStates[p.id] || {};
                                        
                                        // For the host or local user, we know real states easily
                                        const isMicActive = isMe ? isMicOn : !!pState.audio;
                                        const isCamActive = isMe ? isVideoOn : !!pState.video;
                                        const isScreenActive = activeScreenSharePeerId === p.id || (isMe && activeScreenSharePeerId === 'local');

                                        return (
                                            <div key={p.id} className="flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 transition p-3 rounded-xl border border-gray-700/50">
                                                <div className="flex items-center gap-3 truncate">
                                                    {isHost && !isMe && (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedParticipants.includes(p.id)} 
                                                            onChange={() => handleSelectParticipant(p.id)}
                                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 shrink-0"
                                                        />
                                                    )}
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col truncate pr-2">
                                                        <span className="font-semibold text-sm text-gray-200 truncate">{name}</span>
                                                        {String(room.hostId) === String(p.user?._id) && (
                                                            <span className="text-[10px] text-gray-400">Meeting host</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 text-gray-400">
                                                    <span className={isScreenActive ? "text-blue-400" : "hidden"} title="Sharing screen">
                                                        <ScreenShare className="w-4 h-4" />
                                                    </span>
                                                    {p.handRaised && (
                                                        <span className="text-yellow-400 mr-1" title="Hand raised">
                                                            <Hand fill="currentColor" className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                    <span className={isMicActive ? "text-gray-300" : "text-red-400 opacity-50"} title={isMicActive ? "Mic on" : "Mic off"}>
                                                        {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                                    </span>
                                                    <span className={isCamActive ? "text-gray-300" : "text-red-400 opacity-50"} title={isCamActive ? "Cam on" : "Cam off"}>
                                                        {isCamActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {/* Bulk Action Buttons (Host only) */}
                                {isHost && selectedParticipants.length > 0 && (
                                    <div className="p-4 border-t border-gray-800 bg-gray-800/20">
                                        <span className="text-xs text-gray-400 font-medium mb-3 block">Selected: {selectedParticipants.length}</span>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <button onClick={() => handleBulkPermission('mic', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded transition">Grant Mic</button>
                                            <button onClick={() => handleBulkPermission('video', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded transition">Grant Video</button>
                                            <button onClick={() => handleBulkPermission('screen', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded transition">Grant Screen</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => handleBulkPermission('mic', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-2 rounded transition">Revoke Mic</button>
                                            <button onClick={() => handleBulkPermission('video', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-2 rounded transition">Revoke Video</button>
                                            <button onClick={() => handleBulkPermission('screen', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-2 rounded transition">Revoke Screen</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-6 shrink-0">
                        <div className="text-gray-400 font-medium tracking-wide">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | {roomId}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleMic}
                                disabled={!hostGrantedMic}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedMic ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : isMicOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-500 text-white hover:shadow-red-500/20"}`}
                                title={!hostGrantedMic ? "Host disabled mic" : (isMicOn ? "Turn off microphone" : "Turn on microphone")}
                            >
                                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                disabled={!hostGrantedVideo}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedVideo ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : isVideoOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-500 text-white hover:shadow-red-500/20"}`}
                                title={!hostGrantedVideo ? "Host disabled video" : (isVideoOn ? "Turn off camera" : "Turn on camera")}
                            >
                                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={localScreenStream ? stopScreenShare : startScreenShare}
                                disabled={!hostGrantedScreen}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedScreen ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : localScreenStream ? "bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                                title={!hostGrantedScreen ? "Host disabled screen sharing" : (localScreenStream ? "Stop screen sharing" : "Share screen")}
                            >
                                {localScreenStream ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={toggleHand}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${isHandRaised ? "bg-yellow-500 hover:bg-yellow-400 text-white shadow-yellow-500/20" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                                title={isHandRaised ? "Lower hand" : "Raise hand"}
                            >
                                {isHandRaised ? <Hand fill="currentColor" className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
                            </button>
                            <button 
                                onClick={handleDisconnect} 
                                className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 h-12 rounded-full transition-all shadow-lg hover:shadow-red-500/20 ml-2"
                            >
                                {isHost ? "End Meeting" : "Leave"}
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isSidebarOpen ? "bg-blue-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}
                                title="Participants"
                            >
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}