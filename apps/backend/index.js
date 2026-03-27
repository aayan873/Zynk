import dotenv from 'dotenv';
import connectDB from './db.connect.js';
import { startServer } from './server.js';

dotenv.config();

const port = process.env.APP_PORT || process.env.PORT || 5000;

const initApp = async () => {
  await connectDB();
  await startServer({ port });
}

initApp().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});