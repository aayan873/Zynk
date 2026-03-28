import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRoom, getRoom, getHistory, endRoom } from '../controllers/room.controller.js';

const router = express.Router();
router.post('/create', requireAuth, createRoom);

router.get("/history", requireAuth, getHistory)

router.get("/:roomId/end", requireAuth, endRoom)

router.get('/:roomId', getRoom);

export default router;
