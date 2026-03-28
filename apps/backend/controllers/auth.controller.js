import mongoose from 'mongoose';
import User from '../models/User.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const Signup = async (req, res)=>{
  try  {
    const { username, email, password } = req.body;
    
    const ismatched = await User.findOne({email});

    if(ismatched){
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });    
    }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password : hashedPassword,
    isVerified :false
  });

  await newUser.save();

  const token = jwt.sign(
    { id: newUser._id, email: newUser.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.status(201).json({
    success: true,
    message: "Signup successful",
    token,
    user: {
      username: newUser.username,
      email: newUser.email,
    },
  });


  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Signup failed server error",
    });
  }
}


const Login = async (req, res)=>{
    try{
        const {email, password} = req.body;

        const user =  await User.findOne({email});

        if(!user){
          return res.status(401).json({
          success: false,
          message: "User not found",
          });    
        }

    const isMatch = await bcrypt.compare(password,user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email },
                process.env.JWT_SECRET,
              { expiresIn: "1d" } );

    return res.status(201).json({
      success: true,
      message: "Login successful",
        token,
      user: {
        username: user.username,
        email: user.email,
      },
    });


    }
    catch(error){
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Login failed server error",
      });
    }

}


export { Signup, Login}