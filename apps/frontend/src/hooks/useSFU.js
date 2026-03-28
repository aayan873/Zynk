import { useEffect, useRef, useState } from "react"
import { Device } from "mediasoup-client"

export const useSFU = (socket) => {
    
    // State
    const [ localStream, setLocalStream ] = useState(null)
    const [ remoteStreams, setRemoteStreams ] = useState(new Map())
    const [ isConnected, setIsConnected ] = useState(false)

    //Internal Refs
    const deviceRef = useRef(null)
    const sendTransportRef = useRef(null)
    const recvTransportsRef = useRef(new Map())

    const producersRef = useState(new Map())
    const consumersRef = useState(new Map())

    //Init of useEffect

    useEffect(() => {
        if(!socket) return

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                })
                setLocalStream(stream)

                socket.emit("join-room", { roomID: "test-room" }, (res) => {
                    if(res?.error){
                        console.error(`Join failed ${res.error}`)
                    }
                })

                setIsConnected(true)
            } catch (error) {
                console.error(`SFU init ${error}`)
            }
        }
        init()

        return () => {
            cleanup()
        }
    }, [socket])

    const cleanup = () => {
        sendTransportRef.current?.close()

        recvTransportsRef.current.forEach((t) => t.close())

        producersRef.current.forEach((p) => p.close())
        consumersRef.cuurent.forEach((c) => c.close())

        recvTransportsRef.current.clear()
        producersRef.current.clear()
        consumersRef.current.clear()
    }

    //Public API
    const publishTrack = async (track, kind) => {
        console.log("Publish Track not implemented")    //! Implement Later
    }

    const unpublishTrack = async (kind) => {
        console.log("Unpublish Track not implemented")    //! Implement Later
    }
    return {
        localStream,
        remoteStreams,
        publishTrack,
        unpublishTrack,
        isConnected
    }
}