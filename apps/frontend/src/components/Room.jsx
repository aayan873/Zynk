import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { socket } from "../socket"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import { useSFU } from "../hooks/useSFU"
import VideoTile from "./VideoTile"
import ChatSidebar from "./ChatSidebar"
import PollSidebar from "./PollSidebar"
import toast from "react-hot-toast"
import { Mic, MicOff, Video, VideoOff, Hand, Users, DoorOpen, ScreenShare, ScreenShareOff, MessageSquare, BarChart, Copy, X, ChevronDown } from "lucide-react"

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
    const [activeSidebar, setActiveSidebar] = useState("people")
    const [messages, setMessages] = useState([])
    const [isChatEnabled, setIsChatEnabled] = useState(true)
    const [isHandRaised, setIsHandRaised] = useState(false)
    const [activePoll, setActivePoll] = useState(null)
    const [pollHistory, setPollHistory] = useState([])
    const [showInviteOverlay, setShowInviteOverlay] = useState(true)
    // Mobile: sidebar shows as overlay
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const videoRef = useRef(null)
    const hasJoinedRef = useRef(false)
    const publishedTrackIdsRef = useRef(new Set())

    const currentUserId = auth?.user?._id || auth?.user?.id
    const isHost = room?.hostId === currentUserId
    const isReturningParticipant = room?.participants?.includes(currentUserId)

    useEffect(() => {
        if (status === "idle" && localStream && videoRef.current) {
            videoRef.current.srcObject = localStream
        }
    }, [status, localStream])

    useEffect(() => {
        const unlockAudioAndVideos = () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            if (AudioContext) {
                const ctx = new AudioContext()
                ctx.resume()
            }
            const videos = document.querySelectorAll("video")
            videos.forEach(v => { if (!v.muted) v.play().catch(() => {}) })
            document.removeEventListener("click", unlockAudioAndVideos)
        }
        document.addEventListener("click", unlockAudioAndVideos)
        return () => document.removeEventListener("click", unlockAudioAndVideos)
    }, [])

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await axios.get(`/api/meets/${roomId}`, {
                    headers: { Authorization: `Bearer ${auth?.token}` }
                })
                setRoom(res.data)
            } catch (err) { console.error(err) }
        }
        fetchRoom()
    }, [roomId])

    useEffect(() => {
        if (room) {
            if (isHost) {
                setHostGrantedMic(true); setHostGrantedVideo(true); setHostGrantedScreen(true)
                setIsMicOn(true); setIsVideoOn(true)
            } else {
                setHostGrantedMic(false); setHostGrantedVideo(false); setHostGrantedScreen(false)
                setIsMicOn(false); setIsVideoOn(false)
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
                if (res?.error) { console.error(res.error); hasJoinedRef.current = false; setStatus("idle") }
            })
        }
    }, [room, auth, isReady, isHost, isReturningParticipant, roomId])

    useEffect(() => {
        if (status !== "joined" || !isConnected || !localStream || !isTransportReady) return
        localStream.getTracks().forEach((track) => {
            if (publishedTrackIdsRef.current.has(track.id)) return
            if (!isHost) track.enabled = false
            publishedTrackIdsRef.current.add(track.id)
            publishTrack(track, track.kind, track.kind === "audio" ? "mic" : "camera").then(() => {
                if (!isHost) toggleProducer(track.kind, false)
            })
        })
    }, [status, isConnected, localStream, isTransportReady, publishTrack, isHost, toggleProducer])

    useEffect(() => {
        if (!isHost) return
        socket.on("user-requesting-join", ({ socketId, user }) => {
            setRequests(prev => prev.find(r => r.socketId === socketId) ? prev : [...prev, { socketId, user }])
        })
        return () => socket.off("user-requesting-join")
    }, [isHost])

    useEffect(() => {
        socket.on("join-approved", () => {
            if (hasJoinedRef.current) return
            hasJoinedRef.current = true
            socket.emit("join-room", { roomID: roomId }, (res) => {
                if (res?.error) { hasJoinedRef.current = false; setStatus("idle"); return }
                setStatus("joined")
            })
        })
        socket.on("join-rejected", () => { alert("The host denied your entry."); setStatus("idle") })
        return () => { socket.off("join-approved"); socket.off("join-rejected") }
    }, [roomId])

    useEffect(() => {
        const handlePermissionGranted = ({ type }) => {
            if (type === "mic") { setHostGrantedMic(true); alert("Host has granted you mic permission.") }
            else if (type === "video") { setHostGrantedVideo(true); alert("Host has granted you video permission.") }
            else if (type === "screen") { setHostGrantedScreen(true); alert("Host has granted you screen share permission.") }
        }
        const handlePermissionRevoked = ({ type }) => {
            if (type === "mic") {
                setHostGrantedMic(false); setIsMicOn(false)
                localStream?.getAudioTracks().forEach(t => t.enabled = false)
                toggleProducer("audio", false)
                alert("Host revoked your mic permission.")
            } else if (type === "video") {
                setHostGrantedVideo(false); setIsVideoOn(false)
                localStream?.getVideoTracks().forEach(t => t.enabled = false)
                toggleProducer("video", false)
                alert("Host revoked your video permission.")
            } else if (type === "screen") {
                setHostGrantedScreen(false)
                if (localScreenStream) stopScreenShare()
                alert("Host revoked your screen share permission.")
            }
        }
        socket.on("permission-granted", handlePermissionGranted)
        socket.on("permission-revoked", handlePermissionRevoked)
        return () => { socket.off("permission-granted", handlePermissionGranted); socket.off("permission-revoked", handlePermissionRevoked) }
    }, [localStream, toggleProducer])

    useEffect(() => {
        const handleParticipantUpdate = (list) => setParticipants(list)
        const handleHandToggled = ({ socketId, isRaised, user }) => {
            if (isRaised) toast(`${user?.name || "Someone"} raised their hand`, { icon: <Hand className="w-4 h-4 text-yellow-500" /> })
        }
        socket.on("participant-update", handleParticipantUpdate)
        socket.on("hand-toggled", handleHandToggled)
        return () => { socket.off("participant-update", handleParticipantUpdate); socket.off("hand-toggled", handleHandToggled) }
    }, [])

    useEffect(() => {
        if (participants.length > 1) setShowInviteOverlay(false)
    }, [participants.length])

    useEffect(() => { return () => { hasJoinedRef.current = false; publishedTrackIdsRef.current.clear() } }, [])

    useEffect(() => {
        if (status !== "joined") return
        socket.emit("get-chat-data", { roomID: roomId }, (res) => {
            if (res?.success) { setIsChatEnabled(res.isChatEnabled); setMessages(res.messages || []) }
        })
        const handleChatStatus = ({ isEnabled }) => setIsChatEnabled(isEnabled)
        const handleNewMessage = (msg) => setMessages(prev => [...prev, msg])
        socket.on("chat-status-changed", handleChatStatus)
        socket.on("new-message", handleNewMessage)
        return () => { socket.off("chat-status-changed", handleChatStatus); socket.off("new-message", handleNewMessage) }
    }, [status, roomId])

    const handleSendMessage = (text) => socket.emit("send-message", { roomID: roomId, text })

    useEffect(() => {
        if (status !== "joined") return
        socket.emit("get-poll-data", { roomID: roomId }, (res) => {
            if (res?.success) { setActivePoll(res.activePoll || null); setPollHistory(res.history || []) }
        })
        const handleNewPoll = (poll) => setActivePoll(poll)
        const handlePollEnded = ({ pollId, finalPoll }) => {
            setActivePoll(null)
            if (isHost && finalPoll) setPollHistory(prev => [finalPoll, ...prev])
            toast("The active poll has ended.", { icon: <BarChart className="w-4 h-4 text-blue-500" /> })
        }
        socket.on("new-poll", handleNewPoll)
        socket.on("poll-ended", handlePollEnded)
        return () => { socket.off("new-poll", handleNewPoll); socket.off("poll-ended", handlePollEnded) }
    }, [status, roomId, isHost])

    const handleToggleChat = (isEnabled) => socket.emit("toggle-chat", { roomID: roomId, isEnabled })

    useEffect(() => {
        const onMeetingEnded = () => { alert("The host has ended the meeting."); leaveRoom(); navigate("/dashboard") }
        const onKicked = () => { alert("You have been removed from the meeting."); leaveRoom(); navigate("/dashboard") }
        socket.on("meeting-ended", onMeetingEnded)
        socket.on("kicked-from-meeting", onKicked)
        return () => { socket.off("meeting-ended", onMeetingEnded); socket.off("kicked-from-meeting", onKicked) }
    }, [navigate, leaveRoom])

    const handleDisconnect = () => {
        if (isHost) {
            socket.emit("end-meeting", (res) => { if (res?.error) console.error(res.error); navigate("/dashboard") })
        } else { leaveRoom(); navigate("/dashboard") }
    }

    const handleJoin = () => {
        setStatus("waiting")
        socket.emit("request-to-join", { roomID: roomId }, (res) => {
            if (res?.error) { console.log(res.error); setStatus("idle") }
        })
    }

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => { track.enabled = !isMicOn })
            toggleProducer("audio", !isMicOn)
            setIsMicOn(!isMicOn)
        }
    }

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => { track.enabled = !isVideoOn })
            toggleProducer("video", !isVideoOn)
            setIsVideoOn(!isVideoOn)
        }
    }

    const toggleHand = () => {
        const newStatus = !isHandRaised
        setIsHandRaised(newStatus)
        socket.emit("toggle-hand", { isRaised: newStatus })
    }

    const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); toast.success("Invite link copied!") }

    const handleBulkPermission = (type, action) => {
        if (selectedParticipants.length === 0) return
        socket.emit(action === "grant" ? "grant-permission" : "revoke-permission", {
            roomID: roomId, targetSocketIds: selectedParticipants, type
        })
        setSelectedParticipants([])
    }

    const handleSelectParticipant = (id) => {
        setSelectedParticipants(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])
    }

    const handleDecision = (targetSocketId, decision) => {
        socket.emit("host-decision", { roomID: roomId, targetSocketId, decision })
        setRequests(prev => prev.filter(req => req.socketId !== targetSocketId))
    }

    const handleKickSelected = () => {
        if (selectedParticipants.length === 0) return
        socket.emit("remove-peer", { roomID: roomId, targetSocketIds: selectedParticipants })
        setSelectedParticipants([])
    }

    const handleSidebarToggle = (panel) => {
        if (activeSidebar === panel && sidebarOpen) {
            setSidebarOpen(false)
        } else {
            setActiveSidebar(panel)
            setSidebarOpen(true)
        }
    }

    if (!room) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-gray-400">Loading Room...</span>
            </div>
        </div>
    )

    // Layout Logic
    let mainStreamObj = null
    let otherStreamsObjs = []

    if (status === "joined") {
        const localStreamObj = {
            stream: localStream, peerID: "local", isLocal: true,
            userName: auth?.user?.name || "You"
        }

        if (isHost) mainStreamObj = localStreamObj
        else otherStreamsObjs.push(localStreamObj)

        Array.from(remoteStreams.entries()).forEach(([id, data]) => {
            const participantInfo = participants.find(p => p.id === id)
            const name = participantInfo?.user?.name || participantInfo?.user?._id?.slice(-6) || "Guest"
            if (data.stream) {
                const streamData = { stream: data.stream, peerID: id, isLocal: false, userName: name }
                if (participantInfo && participantInfo.user?._id === room?.hostId && !isHost) {
                    if (mainStreamObj) otherStreamsObjs.push(mainStreamObj)
                    mainStreamObj = streamData
                } else {
                    otherStreamsObjs.push(streamData)
                }
            }
        })

        let screenShareObj = null
        if (activeScreenSharePeerId === "local" && localScreenStream) {
            screenShareObj = { stream: localScreenStream, peerID: "local_screen", isLocal: true, isScreen: true, userName: `${auth?.user?.name || "You"} (Screen)` }
        } else if (activeScreenSharePeerId && activeScreenSharePeerId !== "local") {
            const data = remoteStreams.get(activeScreenSharePeerId)
            if (data?.screenStream) {
                const pInfo = participants.find(p => p.id === activeScreenSharePeerId)
                const name = pInfo?.user?.name || pInfo?.user?._id?.slice(-6) || "Guest"
                screenShareObj = { stream: data.screenStream, peerID: `${activeScreenSharePeerId}_screen`, isLocal: false, isScreen: true, userName: `${name} (Screen)` }
            }
        }

        if (screenShareObj) {
            if (mainStreamObj) otherStreamsObjs.unshift(mainStreamObj)
            mainStreamObj = screenShareObj
        } else if (!mainStreamObj && otherStreamsObjs.length > 0) {
            mainStreamObj = otherStreamsObjs[0]
            otherStreamsObjs = otherStreamsObjs.slice(1)
        } else if (!mainStreamObj && localStream) {
            mainStreamObj = localStreamObj
        }
    }

    return (
        <div className={`bg-gray-950 text-white flex flex-col ${status === "joined" ? "h-screen overflow-hidden" : "min-h-screen pt-8 sm:pt-12 items-center px-4"}`}>

            {/* Header — idle/waiting only */}
            {status !== "joined" && (
                <div className="text-center mb-6 sm:mb-8 w-full">
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">{room.title}</h2>
                    <span className="inline-block mt-3 px-3 py-1 bg-gray-800 text-gray-300 text-sm font-medium rounded-full border border-gray-700">
                        {room.type}
                    </span>
                </div>
            )}

            {/* IDLE — Lobby */}
            {status === "idle" && (
                <div className="flex flex-col items-center bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-800 shadow-xl w-full max-w-3xl">
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative border border-gray-800 mb-5">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                    </div>
                    <button onClick={handleJoin} className="bg-blue-600 hover:bg-blue-500 text-base sm:text-lg font-bold py-3 sm:py-4 px-10 sm:px-12 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20">
                        Ask to Join
                    </button>
                    <p className="text-gray-500 text-sm mt-4">Make sure your hair looks good!</p>
                </div>
            )}

            {/* WAITING */}
            {status === "waiting" && (
                <div className="flex flex-col items-center mt-16 sm:mt-20 px-4 text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-xl sm:text-2xl font-semibold">Waiting for the host to let you in...</h3>
                    <p className="text-gray-500 mt-2 text-sm sm:text-base">They know you're here. Hang tight!</p>
                </div>
            )}

            {/* JOINED */}
            {status === "joined" && (
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Main Content Area */}
                    <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 relative">

                        {/* Video Area */}
                        <div className="flex-1 relative bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center border border-gray-800 min-w-0">
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

                            {/* PIP grid */}
                            {otherStreamsObjs.length > 0 && (
                                <div className="absolute bottom-3 right-3 flex gap-1.5 sm:gap-2 overflow-x-auto max-w-[85%] sm:max-w-full pb-1 z-10 px-2 py-2 bg-black/30 rounded-xl backdrop-blur-sm">
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

                            {/* Host Admission Panel */}
                            {isHost && requests.length > 0 && (
                                <div className="absolute top-3 left-3 bg-gray-900/90 border border-gray-700 shadow-2xl rounded-2xl p-4 sm:p-6 w-[calc(100%-24px)] sm:w-96 z-20 backdrop-blur-md max-h-[60%] flex flex-col">
                                    <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold border-b border-gray-800 pb-3 mb-4 shrink-0">
                                        <DoorOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" /> Someone is knocking!
                                    </h3>
                                    <div className="space-y-3 overflow-y-auto">
                                        {requests.map((req) => (
                                            <div key={req.socketId} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                                <span className="font-medium text-gray-200 truncate text-sm">{req.user?.name || req.user?._id?.slice(-6) || "Guest User"}</span>
                                                <div className="flex space-x-2 shrink-0 ml-2">
                                                    <button onClick={() => handleDecision(req.socketId, "reject")} className="px-2.5 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md text-xs font-semibold transition">Deny</button>
                                                    <button onClick={() => handleDecision(req.socketId, "admit")} className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-sm transition">Admit</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Invite Overlay */}
                            {isHost && showInviteOverlay && (
                                <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 bg-gray-900/90 border border-gray-700 shadow-2xl rounded-2xl p-4 sm:p-5 w-[calc(100%-24px)] sm:w-80 z-20 backdrop-blur-md">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-base sm:text-lg font-bold">Your meeting's ready</h3>
                                        <button onClick={() => setShowInviteOverlay(false)} className="text-gray-400 hover:text-white transition ml-2">
                                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-400 mb-4">Share this link with others you want in the meeting.</p>
                                    <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition shadow-lg text-sm">
                                        <Copy className="w-4 h-4" /> Copy Invite Link
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sidebar — desktop: inline panel, mobile: hidden (handled below as overlay) */}
                        {sidebarOpen && (
                            <>
                                {/* Mobile backdrop */}
                                <div
                                    className="fixed inset-0 bg-black/60 z-30 sm:hidden"
                                    onClick={() => setSidebarOpen(false)}
                                />
                                {/* Sidebar panel */}
                                <div className={`
                                    fixed sm:relative z-40 sm:z-auto
                                    bottom-20 sm:bottom-auto right-0 sm:right-auto
                                    w-full sm:w-80 
                                    h-[60vh] sm:h-auto
                                    bg-gray-900 rounded-t-2xl sm:rounded-2xl 
                                    border border-gray-800 flex flex-col overflow-hidden shadow-lg shrink-0
                                    transition-transform duration-200
                                `}>
                                    {/* Mobile drag handle */}
                                    <div className="flex justify-center pt-2 pb-1 sm:hidden">
                                        <div className="w-10 h-1 bg-gray-700 rounded-full" />
                                    </div>

                                    {activeSidebar === "people" && (
                                        <>
                                            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
                                                <h3 className="text-base sm:text-lg font-bold">People</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold bg-gray-800 px-2 py-1 rounded-full text-gray-300">{participants.length}</span>
                                                    <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white sm:hidden">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                                                {participants.map((p) => {
                                                    const isMe = p.id === socket.id
                                                    const name = isMe ? `${p.user?.name || "You"} (You)` : (p.user?.name || p.user?._id?.slice(-6) || "Guest")
                                                    const pState = participantStates[p.id] || {}
                                                    const isMicActive = isMe ? isMicOn : !!pState.audio
                                                    const isCamActive = isMe ? isVideoOn : !!pState.video
                                                    const isScreenActive = activeScreenSharePeerId === p.id || (isMe && activeScreenSharePeerId === 'local')
                                                    return (
                                                        <div key={p.id} className="flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 transition p-2.5 sm:p-3 rounded-xl border border-gray-700/50">
                                                            <div className="flex items-center gap-2 sm:gap-3 truncate">
                                                                {isHost && !isMe && (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedParticipants.includes(p.id)}
                                                                        onChange={() => handleSelectParticipant(p.id)}
                                                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded shrink-0"
                                                                    />
                                                                )}
                                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                                                                    {name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col truncate">
                                                                    <span className="font-semibold text-xs sm:text-sm text-gray-200 truncate">{name}</span>
                                                                    {String(room.hostId) === String(p.user?._id) && (
                                                                        <span className="text-[10px] text-gray-400">Meeting host</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-gray-400">
                                                                {isScreenActive && <ScreenShare className="w-3.5 h-3.5 text-blue-400" />}
                                                                {p.handRaised && <Hand fill="currentColor" className="w-3.5 h-3.5 text-yellow-400" />}
                                                                <span className={isMicActive ? "text-gray-300" : "text-red-400 opacity-50"}>
                                                                    {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                                                </span>
                                                                <span className={isCamActive ? "text-gray-300" : "text-red-400 opacity-50"}>
                                                                    {isCamActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {isHost && selectedParticipants.length > 0 && (
                                                <div className="p-3 sm:p-4 border-t border-gray-800 bg-gray-800/20 shrink-0">
                                                    <span className="text-xs text-gray-400 font-medium mb-2 block">Selected: {selectedParticipants.length}</span>
                                                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                                                        <button onClick={() => handleBulkPermission('mic', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded transition">Grant Mic</button>
                                                        <button onClick={() => handleBulkPermission('video', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded transition">Grant Video</button>
                                                        <button onClick={() => handleBulkPermission('screen', 'grant')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded transition">Grant Screen</button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                                                        <button onClick={() => handleBulkPermission('mic', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-1.5 rounded transition">Revoke Mic</button>
                                                        <button onClick={() => handleBulkPermission('video', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-1.5 rounded transition">Revoke Video</button>
                                                        <button onClick={() => handleBulkPermission('screen', 'revoke')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-1.5 rounded transition">Revoke Screen</button>
                                                    </div>
                                                    <button onClick={handleKickSelected} className="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold py-1.5 rounded transition">Kick User(s)</button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {activeSidebar === "chat" && (
                                        <ChatSidebar
                                            messages={messages}
                                            isChatEnabled={isChatEnabled}
                                            isHost={isHost}
                                            currentUserId={currentUserId}
                                            onSendMessage={handleSendMessage}
                                            onToggleChat={handleToggleChat}
                                            onClose={() => setSidebarOpen(false)}
                                        />
                                    )}

                                    {activeSidebar === "poll" && (
                                        <PollSidebar
                                            roomID={roomId}
                                            socket={socket}
                                            activePoll={activePoll}
                                            pollHistory={pollHistory}
                                            isHost={isHost}
                                            currentUserId={currentUserId}
                                            onClose={() => setSidebarOpen(false)}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="bg-gray-900 border-t border-gray-800 shrink-0 px-3 sm:px-6 py-2 sm:py-0 sm:h-20">
                        {/* Mobile layout: two rows */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 py-2 sm:py-0 h-full">

                            {/* Room info — hidden on smallest screens */}
                            <div className="hidden sm:block text-gray-400 font-medium tracking-wide text-sm shrink-0">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {roomId}
                            </div>

                            {/* Center controls */}
                            <div className="flex items-center justify-center gap-2 sm:gap-4">
                                <button
                                    onClick={toggleMic}
                                    disabled={!hostGrantedMic}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedMic ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : isMicOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-500 text-white"}`}
                                    title={!hostGrantedMic ? "Host disabled mic" : (isMicOn ? "Turn off microphone" : "Turn on microphone")}
                                >
                                    {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                                <button
                                    onClick={toggleVideo}
                                    disabled={!hostGrantedVideo}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedVideo ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : isVideoOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-500 text-white"}`}
                                    title={!hostGrantedVideo ? "Host disabled video" : (isVideoOn ? "Turn off camera" : "Turn on camera")}
                                >
                                    {isVideoOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                                {/* Screen share — hidden on mobile (not really usable) */}
                                <button
                                    onClick={localScreenStream ? stopScreenShare : startScreenShare}
                                    disabled={!hostGrantedScreen}
                                    className={`hidden sm:flex w-12 h-12 items-center justify-center rounded-full transition-all shadow-lg ${!hostGrantedScreen ? "bg-gray-800 text-gray-600 cursor-not-allowed opacity-50" : localScreenStream ? "bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                                    title={!hostGrantedScreen ? "Host disabled screen sharing" : (localScreenStream ? "Stop screen sharing" : "Share screen")}
                                >
                                    {localScreenStream ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={toggleHand}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${isHandRaised ? "bg-yellow-500 hover:bg-yellow-400 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                                    title={isHandRaised ? "Lower hand" : "Raise hand"}
                                >
                                    {isHandRaised ? <Hand fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5" /> : <Hand className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 sm:px-6 py-2 h-10 sm:h-12 rounded-full transition-all shadow-lg text-sm sm:text-base"
                                >
                                    {isHost ? "End" : "Leave"}
                                </button>
                            </div>

                            {/* Right controls: sidebar toggles */}
                            <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
                                <button
                                    onClick={() => handleSidebarToggle("people")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all relative ${activeSidebar === "people" && sidebarOpen ? "bg-blue-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}
                                    title="Participants"
                                >
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {participants.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            {participants.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSidebarToggle("chat")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all ${activeSidebar === "chat" && sidebarOpen ? "bg-blue-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}
                                    title="Chat"
                                >
                                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button
                                    onClick={() => handleSidebarToggle("poll")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all ${activeSidebar === "poll" && sidebarOpen ? "bg-blue-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}
                                    title="Poll"
                                >
                                    <BarChart className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
