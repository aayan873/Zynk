import { Announcement } from '../models/announcement.model.js';
import { Classroom } from '../models/classroom.model.js';
import Teacher from '../models/teacher.model.js';
import Student from '../models/student.model.js';

export const createAnnouncement = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { title, content } = req.body;
        const userId = req.user._id;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required.' });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        const teacher = await Teacher.findOne({ user: userId });
        if (!teacher) {
            return res.status(403).json({ success: false, message: 'Only teachers can post announcements.' });
        }

        const isTeacherForClass = classroom.teachers.some(t => t.toString() === teacher._id.toString());
        if (!isTeacherForClass) {
            return res.status(403).json({ success: false, message: 'You are not a teacher for this classroom.' });
        }

        const newAnnouncement = new Announcement({
            classroom: classroomId,
            author: userId,
            title,
            content
        });

        await newAnnouncement.save();

        classroom.announcements.push(newAnnouncement._id);
        await classroom.save();

        await newAnnouncement.populate('author', 'email role');

        return res.status(201).json({ success: true, data: newAnnouncement });
    } catch (error) {
        console.error('Error creating announcement:', error);
        return res.status(500).json({ success: false, message: 'Server error creating announcement.' });
    }
};

export const getAnnouncements = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found.' });
        }

        const teacher = await Teacher.findOne({ user: userId });
        const student = await Student.findOne({ user: userId });

        const isTeacherForClass = teacher && classroom.teachers.some(t => t.toString() === teacher._id.toString());
        const isStudentForClass = student && classroom.students.some(s => s.toString() === student._id.toString());

        if (!isTeacherForClass && !isStudentForClass && req.user.role !== 'Teacher') {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom.' });
        }

        const announcements = await Announcement.find({ classroom: classroomId })
            .sort({ createdAt: -1 })
            .populate('author', 'email role institution profileCompleted');

        return res.status(200).json({ success: true, data: announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching announcements.' });
    }
};
