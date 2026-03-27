import Router from 'express';
import {Login, Signup} from '../controllers/auth.controller.js';

const router = Router();

router.post("/signup", Signup);
router.post("/login", Login);

export default router;