import router from 'express';
import {Login, Signup} from './controllers/auth.controller.js';

const router = express.router();

router.post("/signup", Signup);
router.post("/login", Login);

export default router;