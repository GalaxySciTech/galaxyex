import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/galaxyex";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(MONGODB_URI);
  isConnected = true;
  console.log("Connected to MongoDB:", MONGODB_URI.replace(/:\/\/[^@]*@/, "://***@"));
}
