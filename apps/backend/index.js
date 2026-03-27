import dotenv from 'dotenv';
import {connectDB} from './db.connect.js';
import { startServer } from './server.js';
import express from 'express';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();

const port = process.env.APP_PORT || process.env.PORT || 5000;

const initApp = async () => {
  await connectDB();
 
   await startServer({ app, port });
  app.use('/api/auth', authRoutes);

}

initApp().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});