import { useEffect, useRef, useState } from "react"

export default function VideoTile({ stream, isLocal = false, peerId }) {
    const videoRef = useRef(null)
    const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !stream) return

        video.srcObject = stream

        // Force play
        const tryPlay = () => {
            video.play().catch(() => {
                // If autoplay blocked, mute and retry
                video.muted = true
                video.play().then(() => {
                    if (!isLocal) {
                        setIsAutoplayBlocked(true)
                    }
                }).catch(() => {})
            })
        }
        tryPlay()

        // Listen for new tracks being added to this stream
        const onTrackAdded = () => {
            // Re-set srcObject to force the video element to pick up the new track
            video.srcObject = stream
            tryPlay()
        }
        stream.addEventListener("addtrack", onTrackAdded)

        return () => {
            stream.removeEventListener("addtrack", onTrackAdded)
        }
    }, [stream, isLocal])

    const handleUnmute = () => {
        const video = videoRef.current
        if (video) {
            video.muted = false
            video.play()
                .then(() => setIsAutoplayBlocked(false))
                .catch(err => console.error("Still unable to autoplay unmuted:", err))
        }
    }

    return (
        <div className="relative bg-black rounded-xl overflow-hidden border border-gray-800 aspect-video">

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""
                    }`}
            />

            {/* Label */}
            <div className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">
                {isLocal ? "You" : peerId?.slice(0, 6)}
            </div>

            {/* Unmute Overlay */}
            {isAutoplayBlocked && !isLocal && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 rounded-xl">
                    <button
                        onClick={handleUnmute}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition-all flex items-center space-x-2"
                    >
                        <span>Unmute Audio</span>
                    </button>
                </div>
            )}

        </div>
    )
}