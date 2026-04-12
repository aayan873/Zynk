import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { isTeacher } from '../middleware/isTeacher.js';
import { createAnnouncement, getAnnouncements } from '../controllers/announcement.controller.js';

const router = express.Router();

router.get('/:classroomId', requireAuth, getAnnouncements);
router.post('/:classroomId', requireAuth, isTeacher, createAnnouncement);

export default router;
