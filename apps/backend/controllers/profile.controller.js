import User from '../models/user.model.js';
import Teacher from '../models/teacher.model.js';
import Student from '../models/student.model.js';

export const createUserProfile = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (req.user.profileCompleted) {
        return res.status(400).json({ success: false, message: 'Profile already completed' });
    }

    if (userRole === 'Teacher') {
        const { fullName, department, designation, employeeId, bio } = req.body;
        
        if (!fullName || !department || !designation) {
            return res.status(400).json({ success: false, message: 'Missing required Teacher fields' });
        }
        
        const teacherProfile = new Teacher({
            user: req.user._id,
            fullName,
            department,
            designation,
            employeeId,
            bio
        });
        
        await teacherProfile.save();
    } else if (userRole === 'Student') {
        const { fullName, rollNumber, programme, branch, semester, batchYear } = req.body;
        
        if (!fullName || !rollNumber || !programme || !branch || !semester || !batchYear) {
            return res.status(400).json({ success: false, message: 'Missing required Student fields' });
        }
        
        const studentProfile = new Student({
            user: req.user._id,
            fullName,
            rollNumber,
            programme,
            branch,
            semester,
            batchYear
        });
        
        await studentProfile.save();
    }

    req.user.profileCompleted = true;
    await req.user.save();

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userRole = req.user.role;
    let profile = null;

    if (userRole === 'Teacher') {
        profile = await Teacher.findOne({ user: req.user._id }).populate('user', '-password');
    } else if (userRole === 'Student') {
        profile = await Student.findOne({ user: req.user._id }).populate('user', '-password');
    }

    if (!profile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { institution, ...profileFields } = req.body;

    let updatedProfile = null;

    if (userRole === 'Teacher') {
        updatedProfile = await Teacher.findOneAndUpdate(
            { user: req.user._id },
            { $set: profileFields },
            { new: true, runValidators: true }
        ).populate('user', '-password');
    } else if (userRole === 'Student') {
        updatedProfile = await Student.findOneAndUpdate(
            { user: req.user._id },
            { $set: profileFields },
            { new: true, runValidators: true }
        ).populate('user', '-password');
    }

    if (!updatedProfile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (institution && institution !== req.user.institution) {
        req.user.institution = institution;
        await req.user.save();
        updatedProfile.user.institution = institution;
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
