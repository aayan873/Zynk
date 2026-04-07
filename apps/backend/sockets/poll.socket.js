import { Meeting } from "../models/meeting.model.js";
import { Poll } from "../models/poll.model.js";
import roomManager from "../sfu/roomManager.js";

// Track active timeouts to clear them if host manually ends poll early
export const activePollTimers = new Map();

export const registerPollSocket = (io, socket) => {
    socket.on("get-poll-data", async ({ roomID }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });

    socket.on("create-poll", async ({ roomID, question, options, correctOptionId, timerDuration }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });

    socket.on("submit-poll-vote", async ({ roomID, optionId }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });

    socket.on("end-poll", async ({ roomID }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });
};
