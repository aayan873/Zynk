import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log("MongoDB successfully connected");
    }
    catch(error){
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}