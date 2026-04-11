import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile
} from '../controllers/profile.controller.js';

const router = express.Router();

// All profile endpoints require a valid user token
router.post('/', requireAuth, createUserProfile);
router.get('/', requireAuth, getUserProfile);
router.patch('/', requireAuth, updateUserProfile);

export default router;
