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
                if(params?.error){
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
        init()
        
        return () => {
            socket.off("router-rtp-capabilities", handlerRouterCapabilities)
            socket.off("existing-producers", handleExistingProducers)
            socket.off("new-producer", handleNewProducer)
            socket.off("peer-left", handlePeerLeft)
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



    const consumeProducer = async (producerID, peerID, kind) => {
        try {
            const device = deviceRef.current
            if(!device){
                throw new Error(`Device Not Loaded`)
            }

            //Create Recv Transport (req to server)
            socket.emit("create-recv-transport", async (params) => {
                if(params?.error){
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
                            producerID: res.producerID,
                            kind: res.kind,
                            rtpParameters: res.rtpParameters
                        })

                        consumersRef.current.set(consumer.id, consumer)

                        const stream = new MediaStream([consumer.track])

                        setRemoteStreams((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(consumer.id, {
                                stream,
                                peerID,
                                kind
                            })
                            return newMap
                        })

                        //Resume consumer (Start Flow)
                        socket.emit("resume-consumer", { consumerID: consumer.id })

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
        console.log(`Existing Producers: ${producers}`);
        
        for(const { producerID, peerID, kind } of producers){
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
        isConnected
    }
}