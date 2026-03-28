import Router from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { Login, Signup, validateAuth } from '../controllers/auth.controller.js';

const router = Router();

router.post('/signup', Signup);
router.post('/login', Login);
router.get('/validate', requireAuth, validateAuth);

export default router;
