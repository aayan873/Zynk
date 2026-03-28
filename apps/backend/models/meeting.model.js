import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    hostId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["MEET", "WEBINAR"],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
    },
    participants: [{
        type: String
    }]
});

export const Meeting = mongoose.model("Meeting", meetingSchema);