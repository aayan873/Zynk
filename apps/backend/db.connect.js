import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.ATLAS_URI) {
            throw new Error("ATLAS_URI is not defined in environment variables");
        }

        await mongoose.connect(process.env.ATLAS_URI);
        console.log("MongoDB successfully connected");
    }
    catch(error){
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

export default connectDB;
