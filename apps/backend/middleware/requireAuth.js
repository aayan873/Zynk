import jwt from 'jsonwebtoken';
import User from '../models/User.models.js';


const requireAuth = async (req, res , next) =>{
    try{
      const authHeader = req.headers.authorization;  //jwt token taken from headers

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
    
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({success: false,message: "User not found",});
    }

    req.user = user;
    next()

    }catch(error){
      return res.status(401).json({success: false, message:"Invalid or Expired Token"});
    }
}

export default requireAuth;