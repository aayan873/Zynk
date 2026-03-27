import mediasoup from "mediasoup"
import os from "os"

const workers = []
let nextWorkerIndex = 0

// CONFIG
const WORKER_SETTINGS = {
  logLevel: "warn",
  logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
}

const BASE_PORT = process.env.BASE_PORT    // starting range
const PORT_RANGE_SIZE = process.env.PORT_RANGE_SIZE // per worker


const attachWorkerEvents = (worker, index) => {
    worker.on("died", async () => {
        console.error(`Worker ${index} (PID ${worker.pid}) died`)

        setTimeout(async () => {
            console.log(`Restarting worker ${index}`)

            const newWorker = await mediasoup.createWorker({
                ...WORKER_SETTINGS,
                rtcMinPort: BASE_PORT + index * PORT_RANGE_SIZE,
                rtcMaxPort: BASE_PORT + (index + 1) * PORT_RANGE_SIZE - 1,
            })

            attachWorkerEvents(newWorker, index)
            workers[index] = newWorker
        }, 2000)
    })
}

const getWorker = () => {
    const worker = workers[nextWorkerIndex]
    nextWorkerIndex = (nextWorkerIndex+1) % workers.length;

    return worker
}


const createWorkers = async () => {
  const numCores = os.cpus().length

  console.log(`Spawning ${numCores} mediasoup workers`);

  for (let i = 0; i < numCores; i++) {
    const worker = await mediasoup.createWorker({
      ...WORKER_SETTINGS,

      rtcMinPort: BASE_PORT + i * PORT_RANGE_SIZE,
      rtcMaxPort: BASE_PORT + (i + 1) * PORT_RANGE_SIZE - 1,
    })

    attachWorkerEvents(worker, i);

    workers.push(worker);
  }
}


export {
    getWorker,
    createWorkers,
    attachWorkerEvents
}