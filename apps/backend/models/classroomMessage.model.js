import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  }
}, { _id: false });

const classroomMessageSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      // NOTE: This will store AES cipher text, NOT plain text!
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomMessage',
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [reactionSchema],
  },
  { timestamps: true }
);

export const ClassroomMessage = mongoose.model('ClassroomMessage', classroomMessageSchema);
