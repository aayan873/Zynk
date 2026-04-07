import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true }
}, { _id: false });

const voteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    optionId: { type: String, required: true }
}, { _id: false });

const pollSchema = new mongoose.Schema({
    roomId: { 
        type: String, 
        required: true, 
        index: true 
    },
    question: { 
        type: String, 
        required: true 
    },
    options: { 
        type: [optionSchema], 
        required: true 
    },
    correctOptionId: { 
        type: String 
    },
    timerDuration: { 
        type: Number, 
        required: true // Storing the duration in seconds
    },
    status: { 
        type: String, 
        enum: ["active", "ended"], 
        default: "active" 
    },
    votes: [voteSchema],
    endedAt: { 
        type: Date 
    }
}, { timestamps: true });

export const Poll = mongoose.model("Poll", pollSchema);
