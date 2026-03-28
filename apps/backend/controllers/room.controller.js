import { Meeting } from '../models/Meeting.model.js';
import crypto from 'crypto';

// The Chef function! We export it so the rest of the app can use it.
export const createRoom = async (req, res) => {
    try {
        // 1. "req" (Request) is what the user sent us. We grab the title and type they typed in.
        const { title, type } = req.body;

        // 2. Remember Module 1 is done? That means their Auth middleware already 
        // put the logged-in user's ID exactly here: req.user.userId
        const newHostId = req.user.userId;

        // 3. Let's make sure the user passed a title, otherwise reject it!
        if (!title) {
            // "res" (Response) is what we send back to the user. 400 means "Bad Request".
            return res.status(400).json({ error: "Every meeting must have a title!" });
        }

        // 4. Generate a completely unique Room URL Code (like abc-defg-xyz)
        // crypto.randomUUID() generates a long string. We slice it down to look like a Google Meet URL!
        const rawUuid = crypto.randomUUID();
        const roomId = `${rawUuid.substring(0, 3)}-${rawUuid.substring(4, 8)}-${rawUuid.substring(9, 12)}`;

        // 5. Fill out the Meeting blueprint we just made in M3-B01
        const newMeeting = new Meeting({
            roomId: roomId,
            hostId: newHostId,
            type: type || 'MEET', // If they didn't provide a type, we assume it's just a MEET
            title: title,
            // participants will be empty initially, but the host is automatically the first participant!
            participants: [newHostId]
        });

        // 6. Save it permanently to our Database
        await newMeeting.save();

        // 7. Send a success message back to the Frontend (201 means "Created")
        res.status(201).json({
            message: "Room successfully created!",
            roomId: newMeeting.roomId,
            joinLink: `http://localhost:5173/room/${newMeeting.roomId}`,
            meetingDetails: newMeeting
        });

    } catch (error) {
        console.error("Error creating room:", error);
        // 500 means our server crashed or made a mistake
        res.status(500).json({ error: "Failed to create the room." });
    }
};
// M3-B03: Get Room Details
export const getRoom = async (req, res) => {
    try {
        // 1. The Waiter passes us the ID directly from the URL (e.g., abc-def-ghi)
        const { roomId } = req.params;

        // 2. We ask MongoDB to find the room with that exact URL
        // MAGIC TRICK: "hostId" is normally just an ugly string of gibberish. 
        // By adding .populate('hostId'), we tell MongoDB "Hey, go look up the User connected to that gibberish string, and grab their Name and Email for me!"
        const meeting = await Meeting.findOne({ roomId: roomId })
            .populate('hostId', 'name email');

        // 3. What if the room doesn't exist? (Or someone typed a fake URL)
        if (!meeting) {
            return res.status(404).json({ error: "Room not found or link is broken." });
        }

        // 4. Send the metadata to the Frontend Lobby so they can display it!
        // We only send back what's necessary (no passwords, no sensitive data)
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
        const userId = req.user.userId

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

export const endHistory = async (req, res) => {
    try {
        const { roomId } = req.params
        const userId = req.user.userId

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