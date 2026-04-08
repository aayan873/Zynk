import { Meeting } from '../models/meeting.model.js';
import User from '../models/user.model.js';
import Teacher from '../models/teacher.model.js';
import Student from '../models/student.model.js';
import { Classroom } from '../models/classroom.model.js';
import crypto from 'crypto';

// --- NEW SCHEDULING LOGIC ---

export const scheduleMeet = async (req, res) => {
    try {
        const { title, classroom, scheduledFor, scheduledEndTime, type } = req.body;
        const hostId = req.user._id;

        if (!title || !classroom || !scheduledFor) {
            return res.status(400).json({ error: "Title, classroom, and scheduledFor are required!" });
        }

        const rawUuid = crypto.randomUUID();
        const roomId = `${rawUuid.substring(0, 3)}-${rawUuid.substring(4, 8)}-${rawUuid.substring(9, 12)}`;
        
        const newMeeting = new Meeting({
            roomId,
            hostId,
            type: type || 'MEET',
            title,
            classroom,
            scheduledFor,
            scheduledEndTime,
            startedAt: null, // So it doesn't appear active immediately
            participants: [hostId]
        });

        await newMeeting.save();

        res.status(201).json({
            success: true,
            message: "Meeting successfully scheduled!",
            roomId: newMeeting.roomId,
            meetingDetails: newMeeting
        });

    } catch (error) {
        console.error("Error scheduling meet:", error);
        res.status(500).json({ error: "Failed to schedule the meeting." });
    }
};

export const updateScheduledMeet = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, scheduledFor, scheduledEndTime } = req.body;
        
        const meeting = await Meeting.findOne({ roomId: id });
        
        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found." });
        }
        
        if (String(meeting.hostId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Only the host can update this meeting." });
        }

        if (title) meeting.title = title;
        if (scheduledFor) meeting.scheduledFor = scheduledFor;
        if (scheduledEndTime) meeting.scheduledEndTime = scheduledEndTime;

        await meeting.save();
        
        res.status(200).json({ success: true, message: "Meeting updated successfully", meeting });
    } catch (error) {
        res.status(500).json({ error: "Failed to update meeting." });
    }
};

export const deleteScheduledMeet = async (req, res) => {
    try {
        const { id } = req.params;
        
        const meeting = await Meeting.findOne({ roomId: id });
        if (!meeting) return res.status(404).json({ error: "Meeting not found." });

        if (String(meeting.hostId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Only the host can delete this meeting." });
        }

        await Meeting.deleteOne({ roomId: id });
        res.status(200).json({ success: true, message: "Meeting deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete meeting." });
    }
};

const getUserClassrooms = async (userRecord) => {
    let classroomIds = [];
    if (userRecord.role === 'Teacher') {
        const teacher = await Teacher.findOne({ user: userRecord._id });
        if (teacher) {
            const classes = await Classroom.find({ teachers: teacher._id });
            classroomIds = classes.map(c => c._id);
        }
    } else if (userRecord.role === 'Student') {
        const student = await Student.findOne({ user: userRecord._id });
        if (student) {
            const classes = await Classroom.find({ students: student._id });
            classroomIds = classes.map(c => c._id);
        }
    }
    return classroomIds;
};

export const getUpcomingMeetsForAllClassrooms = async (req, res) => {
    try {
        const classroomIds = await getUserClassrooms(req.user);
        
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const meets = await Meeting.find({
            classroom: { $in: classroomIds },
            scheduledFor: { $gte: now, $lte: endOfDay }
        }).sort({ scheduledFor: 1 });

        res.status(200).json({ success: true, meets });
    } catch (error) {
        console.error("Error getting all upcoming meets:", error);
        res.status(500).json({ error: "Failed to fetch upcoming meets." });
    }
};

export const getUpcomingMeets = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const classroomIds = await getUserClassrooms(req.user);
        
        if (!classroomIds.some(id => String(id) === String(classroomId))) {
             return res.status(403).json({ error: "You do not have access to this classroom's meets." });
        }

        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const meets = await Meeting.find({
            classroom: classroomId,
            scheduledFor: { $gte: now, $lte: endOfDay }
        }).sort({ scheduledFor: 1 });

        res.status(200).json({ success: true, meets });
    } catch (error) {
        console.error("Error getting upcoming meets:", error);
        res.status(500).json({ error: "Failed to fetch upcoming meets." });
    }
};

// --- EXISTING ROOM LOGIC ---

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
            type: type || 'MEET',
            title: title,
            participants: [newHostId]
        });

        await newMeeting.save();

        res.status(201).json({
            message: "Room successfully created!",
            roomId: newMeeting.roomId,
            joinLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/room/${newMeeting.roomId}`,
            meetingDetails: newMeeting
        });

    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create the room." });
    }
};

export const getRoom = async (req, res) => {
    try {
        const roomId = String(req.params.roomId || "").trim().toLowerCase();

        const meeting = await Meeting.findOne({ roomId: roomId });

        if (!meeting) {
            return res.status(404).json({ error: "Room not found or link is broken." });
        }

        const host = await User.findById(meeting.hostId).select("username email");

        res.status(200).json({
            roomId: meeting.roomId,
            hostId: meeting.hostId,
            title: meeting.title,
            type: meeting.type,
            isActive: meeting.endedAt === null,
            participants: meeting.participants
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

        const meeting = await Meeting.findOne({ roomId })

        if (!meeting) {
            return res.status(404).json({ error: "Room not found" })
        }

        if (String(meeting.hostId) !== String(userId)) {
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
