import { useEffect, useRef, useState, useCallback } from "react"
import { Device } from "mediasoup-client"

export const useSFU = (socket, roomId) => {
    const [localStream, setLocalStream] = useState(null)
    const [localScreenStream, setLocalScreenStream] = useState(null)
    const [activeScreenSharePeerId, setActiveScreenSharePeerId] = useState(null)
    const [remoteStreams, setRemoteStreams] = useState(new Map())
    const [isConnected, setIsConnected] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [isTransportReady, setIsTransportReady] = useState(false)
    const [error, setError] = useState(null)
    const [participantStates, setParticipantStates] = useState({})

    //Internal Refs
    const deviceRef = useRef(null)
    const sendTransportRef = useRef(null)
    const recvTransportsRef = useRef(new Map())
    const producersInfoMapRef = useRef(new Map())

    const producersRef = useRef(new Map())
    const consumersRef = useRef(new Map())
    const pendingProducersRef = useRef([])

    //Init of useEffect

    useEffect(() => {
        if (!socket) return

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                })
                setLocalStream(stream)
            } catch (error) {
                console.error(`SFU init ${error}`)
            }
        }

        const handlerRouterCapabilities = async (rtpCapabilities) => {
            try {
                if (!deviceRef.current) {
                    const device = new Device()
                    await device.load({
                        routerRtpCapabilities: rtpCapabilities
                    })
                    deviceRef.current = device
                    setIsConnected(true)
                    console.log(`Device Loaded`);
                }

                await createSendTransport()

                if (pendingProducersRef.current.length > 0) {
                    for (const p of pendingProducersRef.current) {
                        await consumeProducer(p.producerId, p.peerID, p.kind, p.appData?.source)
                    }
                    pendingProducersRef.current = []
                }

            } catch (error) {
                setError(error)
                console.error(`Device load failed:`, error);
            }
        }


        const createSendTransport = async () => {
            if(!deviceRef.current){
                console.error(`Device Not Loaded`);
                return
            }

            if (sendTransportRef.current && !sendTransportRef.current.closed) {
                setIsTransportReady(true)
                return
            }

            socket.emit("create-send-transport", async (params) => {
                if (params?.error) {
                    console.error(`Transport Creation Failed: ${params.error}`);
                    return
                }

                try {
                    const device = deviceRef.current

                    //Create Send Transport
                    const transport = device.createSendTransport(params)
                    setIsTransportReady(true)

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
                    transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
                        socket.emit("produce", { kind, rtpParameters, appData }, (res) => {
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

        
        const handlePeerLeft = ({ socketID }) => {
            console.log(`Peer Left: ${socketID}`);
            
            // Remove from Remote Streams
            setRemoteStreams((prev) => {
                const updated = new Map(prev)
                updated.delete(socketID)
                return updated
            })

            setActiveScreenSharePeerId((prev) => prev === socketID ? null : prev)

            // Clean up state
            setParticipantStates(prev => {
                const next = { ...prev }
                delete next[socketID]
                return next
            })

            // Cleanup Consumers specifically attached to this peer
            for (const [consumerID, consumer] of consumersRef.current.entries()) {
                if (consumer.appData?.peerID === socketID) {
                    try { consumer.close() } catch(e) {}
                    consumersRef.current.delete(consumerID)
                }
            }
        }
        
        const handleProducerPaused = ({ producerId, peerID }) => {
            const info = producersInfoMapRef.current.get(producerId);
            if (info && peerID) {
                setParticipantStates(prev => ({
                    ...prev,
                    [peerID]: { ...(prev[peerID] || {}), [info.kind]: false }
                }))
            }
        }

        const handleProducerResumed = ({ producerId, peerID }) => {
            const info = producersInfoMapRef.current.get(producerId);
            if (info && peerID) {
                setParticipantStates(prev => ({
                    ...prev,
                    [peerID]: { ...(prev[peerID] || {}), [info.kind]: true }
                }))
            }
        }

        const handleProducerClosed = ({ producerId }) => {
            const info = producersInfoMapRef.current.get(producerId);
            if (info) {
                setParticipantStates(prev => ({
                    ...prev,
                    [info.peerID]: { ...(prev[info.peerID] || {}), [info.kind]: false }
                }))
                
                if (info.source === "screen") {
                    setRemoteStreams(prev => {
                        const next = new Map(prev)
                        const existing = next.get(info.peerID)
                        if (existing) {
                            next.set(info.peerID, { ...existing, screenStream: null })
                        }
                        return next
                    })
                    setActiveScreenSharePeerId(prev => prev === info.peerID ? null : prev)
                }

                // Cleanup associated consumer for this producer
                for (const [consumerID, consumer] of consumersRef.current.entries()) {
                    if (consumer.producerId === producerId) {
                        try { consumer.close() } catch(e) {}
                        consumersRef.current.delete(consumerID)
                    }
                }

                producersInfoMapRef.current.delete(producerId)
            }
        }
        
        socket.on("router-rtp-capabilities", handlerRouterCapabilities)
        socket.on("existing-producers", handleExistingProducers)
        socket.on("new-producer", handleNewProducer)
        socket.on("producer-paused", handleProducerPaused)
        socket.on("producer-resumed", handleProducerResumed)
        socket.on("producer-closed", handleProducerClosed)
        socket.on("peer-left", handlePeerLeft)
        setIsReady(true)
        init()
        
        return () => {
            socket.off("router-rtp-capabilities", handlerRouterCapabilities)
            socket.off("existing-producers", handleExistingProducers)
            socket.off("new-producer", handleNewProducer)
            socket.off("producer-paused", handleProducerPaused)
            socket.off("producer-resumed", handleProducerResumed)
            socket.off("producer-closed", handleProducerClosed)
            socket.off("peer-left", handlePeerLeft)
            cleanup()
        }
    }, [socket, roomId])

    const cleanup = () => {
        // Destroy all producers/consumers/transports
        recvTransportsRef.current.forEach((t) => {
            try { t.close() } catch (e) {}
        })
        consumersRef.current.forEach((c) => {
            try { c.close() } catch (e) {}
        })
        producersRef.current.forEach((p) => {
            try { p.producer.close() } catch (e) {}
        })

        if (sendTransportRef.current && !sendTransportRef.current.closed) {
            try { sendTransportRef.current.close() } catch(e) {}
        }
        
        // Clear maps
        recvTransportsRef.current.clear()
        consumersRef.current.clear()
        producersRef.current.clear()

        // Clear refs
        sendTransportRef.current = null
        deviceRef.current = null
        producersInfoMapRef.current.clear()

        // Stop local streams naturally
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(track => track.stop());
        }
        setLocalStream(null)
        setLocalScreenStream(null)
        setActiveScreenSharePeerId(null)
        setRemoteStreams(new Map())
        setParticipantStates({})
        
        setIsConnected(false)
        setIsReady(false)
        setIsTransportReady(false)
    }

    const leaveRoom = () => {
        cleanup()
        socket.emit("leave-meeting")
    }



    const consumeProducer = async (producerId, peerID, kind, source) => {
        try {
            const device = deviceRef.current
            if (!device) {
                throw new Error(`Device Not Loaded`)
            }

            //Create Recv Transport (req to server)
            socket.emit("create-recv-transport", async (params) => {
                if (params?.error) {
                    console.error(`Recv Transport Error: ${params.error}`);
                    return
                }
                
                //Create Recv Transport (Client)
                const transport = device.createRecvTransport(params)

                recvTransportsRef.current.set(transport.id, transport)

                //Connect Transport (DTLS)
                transport.on("connect", ({ dtlsParameters }, callback, errback) => {
                    socket.emit("connect-recv-transport", {transportID: transport.id, dtlsParameters }, (res) => {
                        if(res?.error) {
                            errback(res.error)
                        } else {
                            callback()
                        }
                    })
                })

                //Consume
                socket.emit(
                    "consume",
                    {
                        producerId,
                        transportID: transport.id,
                        rtpCapabilities: device.rtpCapabilities,
                    },
                    async (res) => {
                        if (res?.error){
                            console.error(`Consume Error: ${res.error}`);
                            return
                        }

                        const consumer = await transport.consume({
                            id: res.id,
                            producerId: res.producerId,
                            kind: res.kind,
                            rtpParameters: res.rtpParameters
                        })

                        consumer.appData = { peerID, source }

                        consumersRef.current.set(consumer.id, consumer)

                        setRemoteStreams((prev) => {
                            const newMap = new Map(prev)
                            const existing = newMap.get(peerID) ? { ...newMap.get(peerID) } : { peerID }

                            if (source === "screen") {
                                if (existing.screenStream) {
                                    existing.screenStream.addTrack(consumer.track)
                                } else {
                                    existing.screenStream = new MediaStream([consumer.track])
                                    setActiveScreenSharePeerId(peerID)
                                }
                            } else {
                                if (existing.stream) {
                                    existing.stream.addTrack(consumer.track)
                                } else {
                                    existing.stream = new MediaStream([consumer.track])
                                }
                            }
                            
                            newMap.set(peerID, existing)
                            return newMap
                        })

                        //Resume consumer (Start Flow)
                        socket.emit("resume-consumer", { consumerID: consumer.id }, () => {})

                        //Cleanup Handlers
                        consumer.on("trackended", () => {
                            console.warn(`Track Ended: ${consumer.id}`);    //When Media stops producing, No need to delete producer from consumersRef
                        })

                        consumer.on("transportclose", () => {
                            console.warn(`Transport Closed: ${consumer.id}`)
                            consumersRef.current.delete(consumer.id)    //When Producer leaves
                        })
                    }
                )
            })
        } catch(error) {
            console.error(`Consume Failed: ${error}`);
        }
    }



    //Handling Existing Producers
    const handleExistingProducers = async (producers) => {
        console.log(`Existing Producers:`, producers);

        if (!deviceRef.current) {
            pendingProducersRef.current.push(...producers)
            return
        }

        for (const p of producers) {
            producersInfoMapRef.current.set(p.producerId, { peerID: p.peerID, kind: p.kind, source: p.appData?.source })
            setParticipantStates(prev => ({
                ...prev,
                [p.peerID]: { ...(prev[p.peerID] || {}), [p.kind]: true }
            }))
            await consumeProducer(p.producerId, p.peerID, p.kind, p.appData?.source)
        }
    }

    //Handling New Producer
    const handleNewProducer = async (p) => {
        console.log(`New Producer: ${p.producerId}`);
        producersInfoMapRef.current.set(p.producerId, { peerID: p.peerID, kind: p.kind, source: p.appData?.source })
        setParticipantStates(prev => ({
            ...prev,
            [p.peerID]: { ...(prev[p.peerID] || {}), [p.kind]: true }
        }))
        await consumeProducer(p.producerId, p.peerID, p.kind, p.appData?.source)
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

            return producer.id

        } catch (error) {
            console.error(`Publish track failed ${error}`);
            setError(error)
        }
    }

    const unpublishTrack = async (producerId) => {
        const data = producersRef.current.get(producerId)
        if(!data) return;
        
        data.producer.close()
        socket.emit("close-producer", { producerId })
        producersRef.current.delete(producerId)
    }

    const toggleProducer = async (kind, isEnabled) => {
        const data = Array.from(producersRef.current.values()).find(p => p.kind === kind)
        if (!data) return

        try {
            if (isEnabled) {
                await data.producer.resume()
                socket.emit("resume-producer", { producerId: data.producer.id }, () => {})
            } else {
                await data.producer.pause()
                socket.emit("pause-producer", { producerId: data.producer.id }, () => {})
            }
        } catch (error) {
            console.error(`Toggle producer failed: ${error}`)
        }
    }

    const startScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            })
            setLocalScreenStream(stream)
            setActiveScreenSharePeerId("local")
            
            stream.getTracks().forEach(track => {
                publishTrack(track, track.kind, "screen")
                
                track.onended = () => {
                    stopScreenShare()
                }
            })
        } catch (error) {
            console.error(`Screen share failed: ${error}`)
        }
    }

    const stopScreenShare = useCallback(() => {
        setLocalScreenStream(currentStream => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop())
            }
            return null
        })

        // Safely wipe out all screen producers without relying on exact tracks
        Array.from(producersRef.current.values()).forEach(p => {
            if (p.source === "screen") {
                unpublishTrack(p.producer.id)
            }
        })

        setActiveScreenSharePeerId((prev) => prev === "local" ? null : prev)
    }, [unpublishTrack])

    return {
        localStream,
        localScreenStream,
        remoteStreams,
        activeScreenSharePeerId,
        participantStates,
        publishTrack,
        startScreenShare,
        stopScreenShare,
        unpublishTrack,
        toggleProducer,
        isConnected,
        isReady,
        isTransportReady,
        leaveRoom
    }
}
