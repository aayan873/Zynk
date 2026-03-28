import { useEffect, useRef, useState } from "react"
import { Device } from "mediasoup-client"

export const useSFU = (socket) => {
    
    // State
    const [ localStream, setLocalStream ] = useState(null)
    const [ remoteStreams, setRemoteStreams ] = useState(new Map())
    const [ isConnected, setIsConnected ] = useState(false)

    const [ isDeviceLoaded, setIsDeviceLoaded ] = useState(false)
    const [ error, setError ] = useState(null)

    //Internal Refs
    const deviceRef = useRef(null)
    const sendTransportRef = useRef(null)
    const recvTransportsRef = useRef(new Map())

    const producersRef = useRef(new Map())
    const consumersRef = useRef(new Map())

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

            } catch (error) {
                console.error(`SFU init ${error}`)
            }
        }
        
        const handlerRouterCapabilities = async (rtpCapabilities) => {
            try {
                if (deviceRef.current) {
                    console.warn(`Device already initialized`);
                    return
                }
                const device = new Device()
                
                await device.load({
                    routerRtpCapabilities: rtpCapabilities
                })
                console.log(`RtpCapabilities: ${rtpCapabilities}`);
                
                deviceRef.current = device
                
                setIsDeviceLoaded(true)
                setIsConnected(true)
                console.log(`Device Loaded`);

                //Creating Send Transport
                await createSendTransport()

            } catch (error) {
                setError(error)
                console.error(`Device load failed`);
            }
        }


        const createSendTransport = async () => {
            if(!deviceRef.current){
                console.error(`Device Not Loaded`);
                return
            }

            socket.emit("create-send-transport", async(params) => {
                if(!params.error){
                    console.error(`Transport Creation Failed: ${params.error}`);
                    return
                }

                try {
                    const device = deviceRef.current

                    //Create Send Transport
                    const transport = device.createSendTransport(params)

                    //Connect Event (DTLS Handshake)
                    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
                        socket.emit("connect-send-transport", { dtlsParameters }, (res) => {
                            if(res?.error){
                                console.error(`DTLS connect Failed: ${res.error}`);
                                errback(res.error)
                            } else {
                                callback()
                            }
                        })
                    })

                    //Produce Event (when sending track)
                    transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
                        socket.emit("produce", { kind, rtpParameters }, (res) => {
                            if(res?.error){
                                console.error(`Produce Failed: ${res.error}`);
                                errback(res.error)
                            } else {
                                callback({ id: res.id })
                            }
                        })
                    })

                    sendTransportRef.current = transport
                    console.log(`Send Transport Created`);
                    
                } catch (error){
                    console.error(`Error creating send transport: ${error}`)
                }
            })
        }

        socket.on("router-rtp-capabilities", handlerRouterCapabilities)
        init()
        
        return () => {
            socket.off("router-rtp-capabilities", handlerRouterCapabilities)
            cleanup()
        }
    }, [socket])

    const cleanup = () => {
        sendTransportRef.current?.close()

        recvTransportsRef.current.forEach((t) => t.close())

        producersRef.current.forEach((p) => p.close())
        consumersRef.current.forEach((c) => c.close())

        recvTransportsRef.current.clear()
        producersRef.current.clear()
        consumersRef.current.clear()
    }

    //Public API
    const publishTrack = async (track, kind, source) => {
        try {
            if(!sendTransportRef.current) {
                throw new Error("Send transport not initialised")
            }

            if(!deviceRef.current){
                throw new Error("Device not loaded")
            }

            const transport = sendTransportRef.current
            const producer = await transport.produce({
                track, 
                appData: { kind, source }
            })
            console.log(`Producer created ${producer.id} ${kind} ${source}`);
            
            producersRef.current.set(producer.id, { 
                producer,
                kind,
                source
            })

            producer.on("trackEnded", () => {
                console.warn(`${kind} ${source} track ended`);
                producer.close()
                producersRef.current.delete(producer.id)
            })

            producer.on("transportClose", () =>{
                console.warn(`${kind}, ${source} transport closed`);
                producersRef.current.delete(producer.id)
            })
        } catch (error) {
            console.error(`Publish track failed ${error}`);
            setError(error)
        }
    }

    const unpublishTrack = async (kind, source) => {
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