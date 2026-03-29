import { useEffect, useRef } from "react"

export default function VideoTile({ stream, isLocal = false, peerId }) {
    const videoRef = useRef(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !stream) return

        video.srcObject = stream

        // Force play
        const tryPlay = () => {
            video.play().catch(() => {
                // If autoplay blocked, mute and retry
                video.muted = true
                video.play().catch(() => {})
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
    }, [stream])

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

        </div>
    )
}