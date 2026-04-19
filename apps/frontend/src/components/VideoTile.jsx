import { useEffect, useRef } from "react"

export default function VideoTile({ stream, isLocal = false, isScreen = false, peerId, isMain = false, userName }) {
    const videoRef = useRef(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !stream) return
        video.srcObject = stream
        const tryPlay = () => video.play().catch(err => console.warn("Video play interrupted:", err))
        tryPlay()
        const onTrackAdded = () => { video.srcObject = stream; tryPlay() }
        stream.addEventListener("addtrack", onTrackAdded)
        return () => stream.removeEventListener("addtrack", onTrackAdded)
    }, [stream, isLocal])

    return (
        <div className={`relative bg-black overflow-hidden transition-all ${
            isMain
                ? "w-full h-full flex items-center justify-center rounded-xl sm:rounded-2xl"
                : "w-28 xs:w-36 sm:w-48 md:w-56 aspect-video rounded-lg sm:rounded-xl border border-white/10 shadow-lg shrink-0"
        }`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full ${isMain ? "object-contain bg-[#121414]" : "object-cover"} ${isLocal && !isScreen ? "scale-x-[-1]" : ""}`}
            />
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 text-[10px] sm:text-xs font-medium bg-black/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white truncate max-w-[90%]">
                {userName || (isLocal ? "You" : peerId?.slice(0, 6))}
            </div>
        </div>
    )
}