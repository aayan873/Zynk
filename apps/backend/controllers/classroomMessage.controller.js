import { Classroom } from '../models/classroom.model.js';
import { ClassroomMessage } from '../models/classroomMessage.model.js';
import Teacher from '../models/teacher.model.js';
import Student from '../models/student.model.js';
import User from '../models/user.model.js';

/**
 * Resolves a real { fullName, role } from the Teacher/Student profile tables
 * given a User ObjectId. Falls back gracefully if no profile found.
 */
const resolveProfile = async (userId) => {
    // Try teacher first
    const teacher = await Teacher.findOne({ user: userId }).lean();
    if (teacher) return { fullName: teacher.fullName, role: 'Teacher' };

    // Then try student
    const student = await Student.findOne({ user: userId }).lean();
    if (student) return { fullName: student.fullName, role: 'Student' };

    // Absolute fallback — look up email from User
    const user = await User.findById(userId).lean();
    return { fullName: user?.email || 'Unknown', role: user?.role || 'Student' };
};

/**
 * Attach `senderProfile` to an array of plain message objects.
 * Profile cache avoids hitting DB multiple times for the same sender.
 */
const attachProfiles = async (messages) => {
    const cache = {};

    const resolved = await Promise.all(messages.map(async (msg) => {
        const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
        if (!senderId) return msg;

        if (!cache[senderId]) {
            cache[senderId] = await resolveProfile(senderId);
        }
        msg.senderProfile = cache[senderId];

        // Also resolve replyTo sender profile if present
        if (msg.replyTo?.senderId) {
            const replyId = msg.replyTo.senderId?._id?.toString() || msg.replyTo.senderId?.toString();
            if (!cache[replyId]) {
                cache[replyId] = await resolveProfile(replyId);
            }
            msg.replyTo.senderProfile = cache[replyId];
        }

        return msg;
    }));

    return resolved;
};

export const getMessages = async (req, res) => {
    try {
        const { id: classroomId } = req.params;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        const rawMessages = await ClassroomMessage.find({ classroomId })
            .sort({ createdAt: 1 })
            .populate('senderId', '_id email role')
            .populate({ path: 'replyTo', select: 'content senderId', populate: { path: 'senderId', select: '_id email role' } })
            .populate('mentions', '_id email role')
            .lean();

        const messages = await attachProfiles(rawMessages);

        return res.status(200).json({ success: true, data: messages, isChatEnabled: classroom.isChatEnabled });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching messages.' });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { id: classroomId } = req.params;
        const { content, replyTo, mentions } = req.body;
        const userId = req.user._id;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Message content is required.' });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        // Check if user is teacher, else check if chat is enabled
        const teacher = await Teacher.findOne({ user: userId });
        const isTeacherForClass = teacher && classroom.teachers.some(t => t.toString() === teacher._id.toString());
        
        if (!isTeacherForClass && !classroom.isChatEnabled) {
            return res.status(403).json({ success: false, message: 'Chat is disabled for this classroom.' });
        }

        const newMessage = new ClassroomMessage({
            classroomId,
            senderId: userId,
            content,
            replyTo: replyTo || undefined,
            mentions: mentions || []
        });

        await newMessage.save();

        const rawPopulated = await ClassroomMessage.findById(newMessage._id)
            .populate('senderId', '_id email role')
            .populate({ path: 'replyTo', select: 'content senderId', populate: { path: 'senderId', select: '_id email role' } })
            .populate('mentions', '_id email role')
            .lean();

        // Resolve real profiles
        const [populatedMessage] = await attachProfiles([rawPopulated]);

        // Broadcast to classroom room
        const io = req.app.get('io');
        if (io) {
            io.to(`classroom_${classroomId}`).emit('new-classroom-message', populatedMessage);
        }

        return res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ success: false, message: 'Server error sending message.' });
    }
};

export const reactToMessage = async (req, res) => {
    try {
        const { id: classroomId, msgId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) {
            return res.status(400).json({ success: false, message: 'Emoji is required.' });
        }

        const message = await ClassroomMessage.findById(msgId);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found.' });
        }

        // NOTE: Reactions are allowed even when chat is disabled.
        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`classroom_${classroomId}`).emit('react-to-classroom-message', {
                messageId: msgId,
                reactions: message.reactions
            });
        }

        return res.status(200).json({ success: true, reactions: message.reactions });
    } catch (error) {
        console.error('Error reacting to message:', error);
        return res.status(500).json({ success: false, message: 'Server error reacting to message.' });
    }
};

export const toggleChatStatus = async (req, res) => {
    try {
        const { id: classroomId } = req.params;
        const { isEnabled } = req.body;
        const userId = req.user._id;

        if (typeof isEnabled !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isEnabled boolean flag is required.' });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        const teacher = await Teacher.findOne({ user: userId });
        const isTeacherForClass = teacher && classroom.teachers.some(t => t.toString() === teacher._id.toString());

        if (!isTeacherForClass) {
            return res.status(403).json({ success: false, message: 'Only teachers can toggle chat settings.' });
        }

        classroom.isChatEnabled = isEnabled;
        await classroom.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`classroom_${classroomId}`).emit('classroom-chat-status-changed', { isEnabled });
        }

        return res.status(200).json({ success: true, isChatEnabled: isEnabled });
    } catch (error) {
        console.error('Error toggling chat status:', error);
        return res.status(500).json({ success: false, message: 'Server error toggling chat status.' });
    }
};
