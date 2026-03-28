import { Meeting } from '../models/meeting.model.js';
import crypto from 'crypto';

export const createRoom = async (req, res) => {
    try {
        const { title, type } = req.body;


        const newHostId = req.user._id;

        if (!title) {
            return res.status(400).json({ error: "Every meeting must have a title!" });
        }

        const rawUuid = crypto.randomUUID();
        const roomId = `${rawUuid.substring(0, 3)}-${rawUuid.substring(4, 8)}-${rawUuid.substring(9, 12)}`;
        const newMeeting = new Meeting({
            roomId: roomId,
            hostId: newHostId,
            type: type || 'MEET', // If they didn't provide a type, we assume it's just a MEET
            title: title,
            // participants will be empty initially, but the host is automatically the first participant!
            participants: [newHostId]
        });

        await newMeeting.save();

        res.status(201).json({
            message: "Room successfully created!",
            roomId: newMeeting.roomId,
            joinLink: `http://localhost:5173/room/${newMeeting.roomId}`,
            meetingDetails: newMeeting
        });

    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create the room." });
    }
};

export const getRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const meeting = await Meeting.findOne({ roomId: roomId })
            .populate('hostId', 'name email');

        if (!meeting) {
            return res.status(404).json({ error: "Room not found or link is broken." });
        }
        res.status(200).json({
            title: meeting.title,
            type: meeting.type,
            hostName: meeting.hostId.name,
            isActive: meeting.endedAt === null
        });

    } catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({ error: "Failed to fetch room details." });
    }
};

export const getHistory = async (req, res) => {
    try {
        const userId = req.user._id

        const meetings = await Meeting.find({
            $or: [
                { hostId: userId },
                { participants: userId }
            ]
        }).sort({ startedAt: -1 })
        res.status(200).json(meetings)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Failed to fetch history" })
    }
}

export const endRoom = async (req, res) => {
    try {
        const { roomId } = req.params
        const userId = req.user._id

        const meeting = await Meeting.findOne({ roomId: roomId })

        if (!meeting) {
            return res.status(404).json({ error: "Room not found" })
        }

        if (!meeting.hostId.equals(userId)) {
            return res.status(403).json({ error: "Only host can end meeting" })
        }
        meeting.endedAt = new Date()
        await meeting.save()
        res.status(200).json({ success: true })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Failed to end meeting" })
    }
}
