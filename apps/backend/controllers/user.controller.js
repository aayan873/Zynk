import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Student from '../models/student.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const Signup = async (req, res) => {
    try {
        const { email, password, role, fullName } = req.body;

        if (!role || !['Teacher', 'Student'].includes(role)) {
             return res.status(400).json({ success: false, message: "Valid role ('Teacher' or 'Student') is required" });
        }
        
        if (!fullName) {
             return res.status(400).json({ success: false, message: "Full Name is required" });
        }

        const ismatched = await User.findOne({ email });

        if (ismatched) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }
        
        const domainParts = email.split('@')[1]?.split('.');
        if (!domainParts || domainParts.length < 2) {
             return res.status(400).json({ success: false, message: "Invalid email address format" });
        }
        const institution = domainParts[0].toUpperCase();

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            role,
            fullName,
            institution,
            isVerified: false,
            profileCompleted: false
        });

        if (role === 'Student') {
            const studentRegex = /^([a-zA-Z0-9]+)_(\d{2})(01|02|03|11|21)([a-z]{2})(\d+)@([a-zA-Z0-9-]+)\.(.+)$/;
            const match = email.match(studentRegex);
            
            if (!match) {
                return res.status(400).json({ success: false, message: "Invalid student email format. Must follow [Name]_[RollNumber]@college.domain" });
            }

            const batchYearObj = "20" + match[2];
            const progMap = {
                '01': 'BTech (4 year)',
                '02': 'BTech + Mtech (5 yr dual degree)',
                '03': 'BTech + MBA (5 yr dual degree)',
                '11': 'Mtech (2 years)',
                '21': 'PhD'
            };
            const programmeObj = progMap[match[3]];
            const branchObj = match[4].toUpperCase();
            const rollNumberObj = email.split('@')[0].split('_')[1]; 

            const existingStudentsWithSameRoll = await Student.find({ rollNumber: rollNumberObj })
                .populate({ path: 'user', select: 'institution' });

            const duplicateAtSameInstitution = existingStudentsWithSameRoll.some(
                (student) => student.user?.institution === institution
            );

            if (duplicateAtSameInstitution) {
                return res.status(400).json({
                    success: false,
                    message: "A student with this roll number is already registered at this institution."
                });
            }

            const currentYear = new Date().getFullYear();
            const currentHalf = new Date().getMonth() < 6 ? 1 : 2;
            let sem = (currentYear - parseInt(batchYearObj)) * 2 + (currentHalf === 2 ? 1 : 0);
            sem = Math.max(1, sem);

            await newUser.save();
            
            const studentProfile = new Student({
                user: newUser._id,
                fullName,
                rollNumber: rollNumberObj,
                programme: programmeObj,
                branch: branchObj,
                semester: String(sem),
                batchYear: batchYearObj
            });
            await studentProfile.save();
            
            newUser.profileCompleted = true;
            await newUser.save();
        } else {
            await newUser.save();
        }

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const refreshToken = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role, type: "refresh" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            message: "Signup successful",
            token,
            refreshToken,
            user: {
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                fullName: newUser.fullName,
                institution: newUser.institution,
                profileCompleted: newUser.profileCompleted
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


const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Wrong password",
            });
        }

        const accessToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const refreshToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role, type: "refresh" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );


        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: accessToken,
            refreshToken,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                institution: user.institution,
                profileCompleted: user.profileCompleted
            },
        });


    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed server error",
        });
    }

}

const validateAuth = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};


export { Signup, Login, validateAuth }
