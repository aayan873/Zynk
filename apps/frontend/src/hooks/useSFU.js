import { useEffect, useRef, useState } from "react"
import { Device } from "mediasoup-client"

export const useSFU = (socket, roomId) => {
    const [localStream, setLocalStream] = useState(null)
    const [remoteStreams, setRemoteStreams] = useState(new Map())
    const [isConnected, setIsConnected] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [isTransportReady, setIsTransportReady] = useState(false)
    const [error, setError] = useState(null)

    //Internal Refs
    const deviceRef = useRef(null)
    const sendTransportRef = useRef(null)
    const recvTransportsRef = useRef(new Map())

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
                    for (const { producerID, peerID, kind } of pendingProducersRef.current) {
                        await consumeProducer(producerID, peerID, kind)
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

        
        const handlePeerLeft = ({ socketID }) => {
            console.log(`Peer Left: ${socket.id}`);
            
            //Remove from Remote Streams
            setRemoteStreams((prev) => {
                const updated = new Map(prev)

                for (const [consumerID, data] of prev.entries()) {
                    if(data.peerID === socketID) {
                        const consumer = consumersRef.current.get(consumerID)

                        if(consumer){
                            consumer.close();
                            consumersRef.current.delete(consumerID)
                        }

                        updated.delete(consumerID)
                    }
                }

                return updated
            })

            //Cleanup Recv Transports
            for (const [id, transport] of recvTransportsRef.current.entries()) {
                try{
                    transport.close()
                } catch(error) {
                    console.warn(`Error Closing Transport: ${error}`);
                }

                recvTransportsRef.current.delete(id)
            }
        }
        
        socket.on("router-rtp-capabilities", handlerRouterCapabilities)
        socket.on("existing-producers", handleExistingProducers)
        socket.on("new-producer", handleNewProducer)
        socket.on("peer-left", handlePeerLeft)
        setIsReady(true)
        init()
        
        return () => {
            socket.off("router-rtp-capabilities", handlerRouterCapabilities)
            socket.off("existing-producers", handleExistingProducers)
            socket.off("new-producer", handleNewProducer)
            socket.off("peer-left", handlePeerLeft)
            cleanup()
        }
    }, [socket, roomId])

    const cleanup = () => {
        recvTransportsRef.current.forEach((t) => {
            try { t.close() } catch (e) {}
        })
        consumersRef.current.forEach((c) => {
            try { c.close() } catch (e) {}
        })

        recvTransportsRef.current.clear()
        consumersRef.current.clear()
    }



    const consumeProducer = async (producerID, peerID, kind) => {
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
                        producerID,
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
                            producerId: res.producerID,
                            kind: res.kind,
                            rtpParameters: res.rtpParameters
                        })

                        consumersRef.current.set(consumer.id, consumer)

                        setRemoteStreams((prev) => {
                            const newMap = new Map(prev)
                            const existing = newMap.get(peerID)

                            if (existing) {
                                const stream = new MediaStream([
                                    ...existing.stream.getTracks(),
                                    consumer.track
                                ])
                                newMap.set(peerID, {
                                    ...existing,
                                    stream
                                })
                            } else {
                                newMap.set(peerID, {
                                    stream: new MediaStream([consumer.track]),
                                    peerID,
                                    kind
                                })
                            }
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

        for (const { producerID, peerID, kind } of producers) {
            await consumeProducer(producerID, peerID, kind)
        }
    }

    //Handling New Producer
    const handleNewProducer = async ({ producerID, peerID, kind }) => {
        console.log(`New Producer: ${producerID}`);
        await consumeProducer(producerID, peerID, kind)
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

    const unpublishTrack = async (producerID) => {
        const data = producersRef.current.get(producerID)
        if(!data) return;
        
        data.producer.close()
        socket.emit("close-producer", { producerID })
        producersRef.current.delete(producerID)
    }
    return {
        localStream,
        remoteStreams,
        publishTrack,
        unpublishTrack,
        isConnected,
        isReady,
        isTransportReady
    }
}
