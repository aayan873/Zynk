import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    institute: {
      type: String,
      required: true,
    },
    programme: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    branches: [
      {
        type: String,
      },
    ],
    teachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Classroom = mongoose.model('Classroom', classroomSchema);
