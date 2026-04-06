import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const SERVER_STARTED_AT = Math.floor(Date.now() / 1000);

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Invalidate old access tokens on every backend restart.
    if (!decoded?.iat || decoded.iat < SERVER_STARTED_AT) {
      return res.status(401).json({
        success: false,
        message: "Session expired after server restart",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or Expired Token" });
  }
};

export default requireAuth;
