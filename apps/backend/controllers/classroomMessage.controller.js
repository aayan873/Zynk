import { Classroom } from '../models/classroom.model.js';
import { ClassroomMessage } from '../models/classroomMessage.model.js';
import Teacher from '../models/teacher.model.js';
import Student from '../models/student.model.js';

export const getMessages = async (req, res) => {
    try {
        const { id: classroomId } = req.params;
        const userId = req.user._id;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        const messages = await ClassroomMessage.find({ classroomId })
            .sort({ createdAt: 1 }) // oldest first for chat feed
            .populate('senderId', 'name username email avatar')
            .populate('replyTo', 'content senderId')
            .populate('mentions', 'name username');

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
            content, // encrypted from frontend
            replyTo: replyTo || undefined,
            mentions: mentions || []
        });

        await newMessage.save();

        const populatedMessage = await ClassroomMessage.findById(newMessage._id)
            .populate('senderId', 'name username email avatar')
            .populate('replyTo', 'content senderId')
            .populate('mentions', 'name username');

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

        let updated = false;
        
        // Find existing reaction from this user for this emoji
        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
            // Un-react (toggle off)
            message.reactions.splice(existingReactionIndex, 1);
            updated = true;
        } else {
            // New reaction
            message.reactions.push({ user: userId, emoji });
            updated = true;
        }

        if (updated) {
            await message.save();
        }

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
