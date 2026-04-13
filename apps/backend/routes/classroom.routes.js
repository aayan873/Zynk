import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { isTeacher } from '../middleware/isTeacher.js';
import {
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getClassroom,
  getAllClassrooms,
  enrollClassroom,
} from '../controllers/classroom.controller.js';
import { uploadResource, deleteResource } from '../controllers/resource.controller.js';
import {
  getMessages,
  sendMessage,
  reactToMessage,
  toggleChatStatus,
} from '../controllers/classroomMessage.controller.js';

import { upload } from '../utils/cloudinaryConfig.js';

const router = express.Router();

// POST /api/classrooms/:id/resources
router.post('/:id/resources', requireAuth, upload.single('file'), uploadResource);

// DELETE /api/classrooms/:id/resources/:resourceId
router.delete('/:id/resources/:resourceId', requireAuth, deleteResource);

router.get('/', requireAuth, getAllClassrooms);
router.get('/:id', requireAuth, getClassroom);
router.post('/:id/enroll', requireAuth, enrollClassroom);
router.post('/', requireAuth, isTeacher, createClassroom);
router.patch('/:id', requireAuth, isTeacher, updateClassroom);
router.delete('/:id', requireAuth, isTeacher, deleteClassroom);

// Chat Routes
router.get('/:id/messages', requireAuth, getMessages);
router.post('/:id/messages', requireAuth, sendMessage);
router.post('/:id/messages/:msgId/react', requireAuth, reactToMessage);
router.patch('/:id/chat/toggle', requireAuth, isTeacher, toggleChatStatus);

export default router;
