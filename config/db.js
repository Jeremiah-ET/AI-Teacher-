import mongoose from "mongoose";

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  try {
    await mongoose.connect(mongoUri, { dbName: "ai-teachers" });
    console.log("MongoDB Atlas connected.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export default connectDB;
