import { Meeting } from "../models/meeting.model.js";
import { Poll } from "../models/poll.model.js";
import roomManager from "../sfu/roomManager.js";

// Track active timeouts to clear them if host manually ends poll early
export const activePollTimers = new Map();

// Helper to end a poll, both manually and automatically
export const handleEndPoll = async (io, roomID, pollId) => {
    try {
        const room = roomManager.getRoom(roomID);
        
        // Find poll and update status
        const poll = await Poll.findById(pollId);
        if (!poll || poll.status === "ended") return;

        poll.status = "ended";
        poll.endedAt = new Date();
        await poll.save();

        if (room && room.activePollId === pollId) {
            room.activePollId = null;
        }

        // Clear timer if exists
        const timerId = `${roomID}-${pollId}`;
        if (activePollTimers.has(timerId)) {
            clearTimeout(activePollTimers.get(timerId));
            activePollTimers.delete(timerId);
        }


        io.to(roomID).emit("poll-ended", { pollId, finalPoll: poll });

    } catch (error) {
        console.error("endPollHandler error:", error);
    }
};

export const registerPollSocket = (io, socket) => {
    socket.on("get-poll-data", async ({ roomID }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });

    socket.on("create-poll", async ({ roomID, question, options, correctOptionId, timerDuration }, callback) => {
        try {
            const user = socket.user;
            const normalizedRoomId = String(roomID || "").trim().toLowerCase();
            const room = roomManager.getRoom(normalizedRoomId);

            if (!room) {
                if (callback) callback({ error: "Room not active" });
                return;
            }

            const meeting = await Meeting.findOne({ roomId: normalizedRoomId });
            if (!meeting || String(meeting.hostId) !== String(user._id)) {
                if (callback) callback({ error: "Only the host can create a poll" });
                return;
            }

            if (room.activePollId) {
                if (callback) callback({ error: "A poll is already active in this room. Please end it first." });
                return;
            }

            if (!question || !options || options.length < 2 || !timerDuration) {
                if (callback) callback({ error: "Missing required poll fields" });
                return;
            }

            const newPoll = new Poll({
                roomId: normalizedRoomId,
                question,
                options,
                correctOptionId,
                timerDuration,
                status: "active"
            });

            await newPoll.save();
            const pollIdStr = newPoll._id.toString();

            room.activePollId = pollIdStr;

            // Set auto-close timer
            const timerId = `${normalizedRoomId}-${pollIdStr}`;
            const timeout = setTimeout(() => {
                handleEndPoll(io, normalizedRoomId, pollIdStr);
            }, timerDuration * 1000); // timerDuration is in seconds
            
            activePollTimers.set(timerId, timeout);

            io.to(normalizedRoomId).emit("new-poll", newPoll);
            if (callback) callback({ success: true, poll: newPoll });

        } catch (error) {
            console.error("create-poll error:", error);
            if (callback) callback({ error: "Failed to create poll" });
        }
    });

    socket.on("submit-poll-vote", async ({ roomID, optionId }, callback) => {
        try {
            const user = socket.user;
            const normalizedRoomId = String(roomID || "").trim().toLowerCase();
            const room = roomManager.getRoom(normalizedRoomId);

            if (!room || !room.activePollId) {
                if (callback) callback({ error: "No active poll in this room" });
                return;
            }

            const pollIdStr = room.activePollId;
            const poll = await Poll.findById(pollIdStr);

            if (!poll || poll.status === "ended") {
                if (callback) callback({ error: "Poll has already ended or does not exist" });
                return;
            }

            const existingVoteIndex = poll.votes.findIndex(v => v.userId.toString() === user._id.toString());
            
            if (existingVoteIndex >= 0) {
                poll.votes[existingVoteIndex].optionId = optionId;
            } else {
                poll.votes.push({ userId: user._id, optionId });
            }

            await poll.save();
            
            if (callback) callback({ success: true });

        } catch (error) {
            console.error("submit-poll-vote error:", error);
            if (callback) callback({ error: "Failed to submit vote" });
        }
    });

    socket.on("end-poll", async ({ roomID }, callback) => {
        // To be implemented
        if (callback) callback({ success: true });
    });
};
