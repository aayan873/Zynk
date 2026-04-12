import { Classroom } from '../models/classroom.model.js';
import Student from '../models/student.model.js';
// 1. CREATE CLASSROOM (Teacher Only)
export const createClassroom = async (req, res) => {
  try {
    const { name, description, programme, semester, branches, inviteCode } = req.body;

    const classroom = new Classroom({
      name,
      description,
      institute: req.user.institution,
      programme,
      semester,
      branches,
      inviteCode,
      teachers: [req.user._id],
      students: []
    });

    await classroom.save();

    return res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: classroom
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 2. UPDATE CLASSROOM (Teacher Only)
export const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Authorization: User must be a teacher of THIS classroom
    if (!classroom.teachers.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this classroom' });
    }

    const updatedClassroom = await Classroom.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Classroom updated successfully',
      data: updatedClassroom
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 3. DELETE CLASSROOM (Teacher Only - Soft Delete)
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Authorization: User must be a teacher of THIS classroom
    if (!classroom.teachers.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this classroom' });
    }

    classroom.isActive = false;
    await classroom.save();

    return res.status(200).json({
      success: true,
      message: 'Classroom successfully deleted',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 4. GET SINGLE CLASSROOM (Any User)
export const getClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only return if it's active
    const classroom = await Classroom.findOne({ _id: id, isActive: true })
        .populate('teachers', 'fullName email')
        .populate('students', 'fullName email rollNumber');

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found or inactive' });
    }

    const userId = req.user._id;
    const role = req.user.role;

    if (role === 'Teacher') {
      const isTeacher = classroom.teachers.some((t) => t._id.toString() === userId.toString());
      if (!isTeacher) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this classroom' });
      }
    } else if (role === 'Student') {
      let isAuthorized = classroom.students.some((s) => s._id.toString() === userId.toString());
      
      if (!isAuthorized) {
        const studentProfile = await Student.findOne({ user: userId });
        if (studentProfile) {
           const matchInstitute = classroom.institute === req.user.institution;
           const matchProgramme = classroom.programme === studentProfile.programme;
           const matchSemester = classroom.semester === studentProfile.semester;
           const matchBranch = classroom.branches.includes(studentProfile.branch);

           if (matchInstitute && matchProgramme && matchSemester && matchBranch) {
               isAuthorized = true;
           }
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this classroom' });
      }
    }

    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 5. GET ALL CLASSROOMS (Requires Filtering based on User participation)
export const getAllClassrooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    // Filter to list only active classes that the user belongs to
    let query = { isActive: true };

    if (role === 'Teacher') {
        query.teachers = userId;
    } else if (role === 'Student') {
        const studentProfile = await Student.findOne({ user: userId });
        
        if (studentProfile) {
            query.$or = [
                { students: userId },
                {
                    institute: req.user.institution,
                    programme: studentProfile.programme,
                    semester: studentProfile.semester,
                    branches: { $in: [studentProfile.branch] }
                }
            ];
        } else {
            query.students = userId;
        }
    }

    const classrooms = await Classroom.find(query)
        .populate('teachers', 'fullName email')
        .populate('students', 'fullName email rollNumber');

    return res.status(200).json({
      success: true,
      data: classrooms
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 6. ENROLL CLASSROOM (Student Only)
export const enrollClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    if (role !== 'Student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll in classrooms' });
    }

    const classroom = await Classroom.findOne({ _id: id, isActive: true });
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found or inactive' });
    }

    // Check if already enrolled
    const isEnrolled = classroom.students.includes(userId);
    if (isEnrolled) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this classroom' });
    }

    // Demographic check
    let isAuthorized = false;
    const studentProfile = await Student.findOne({ user: userId });
    
    if (studentProfile) {
      const matchInstitute = classroom.institute === req.user.institution;
      const matchProgramme = classroom.programme === studentProfile.programme;
      const matchSemester = classroom.semester === studentProfile.semester;
      const matchBranch = classroom.branches.includes(studentProfile.branch);

      if (matchInstitute && matchProgramme && matchSemester && matchBranch) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not eligible to enroll in this classroom based on your profile' });
    }

    // Add student to classroom
    classroom.students.push(userId);
    await classroom.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully enrolled in the classroom',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
