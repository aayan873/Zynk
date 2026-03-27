import dotenv from 'dotenv';
import express from "express";
import cors from 'cors';
import connectDB from './db.connect.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  app.use(express.urlencoded({ limit: "40kb", extended: true }));
  app.use(express.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.send("API running");
  });

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});