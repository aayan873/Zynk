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

const router = express.Router();

router.get('/', requireAuth, getAllClassrooms);
router.get('/:id', requireAuth, getClassroom);
router.post('/:id/enroll', requireAuth, enrollClassroom);
router.post('/', requireAuth, isTeacher, createClassroom);
router.patch('/:id', requireAuth, isTeacher, updateClassroom);
router.delete('/:id', requireAuth, isTeacher, deleteClassroom);

export default router;
