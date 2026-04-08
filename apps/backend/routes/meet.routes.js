import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import isTeacher from '../middleware/isTeacher.js';
import {
    scheduleMeet,
    updateScheduledMeet,
    deleteScheduledMeet,
    getUpcomingMeetsForAllClassrooms,
    getUpcomingMeets,
    createRoom,
    getHistory,
    endRoom,
    getRoom
} from '../controllers/meet.controller.js';

const router = express.Router();

// --- SCHEDULING ROUTES ---

// Teacher only
router.post('/schedule', requireAuth, isTeacher, scheduleMeet);
router.patch('/schedule/:id', requireAuth, isTeacher, updateScheduledMeet);
router.delete('/schedule/:id', requireAuth, isTeacher, deleteScheduledMeet);

// Student/Teacher fetching classes
router.get('/upcoming/all', requireAuth, getUpcomingMeetsForAllClassrooms);
router.get('/upcoming/:classroomId', requireAuth, getUpcomingMeets);

// --- ROOM ROUTES ---

// All authenticated users can create instant basic rooms
router.post('/create', requireAuth, createRoom);

// Get meeting history associated with the user
router.get('/history', requireAuth, getHistory);

// End a specific meeting immediately (only host permitted inside logic)
router.get('/:roomId/end', requireAuth, endRoom);

// Get specific meeting properties for joining (public/unauthed potentially, but leaving as is)
router.get('/:roomId', getRoom);

export default router;
