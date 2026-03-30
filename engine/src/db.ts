import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/galaxyex";
  await mongoose.connect(uri);
  isConnected = true;
  console.log("Connected to MongoDB:", uri.replace(/:\/\/[^@]*@/, "://***@"));
}

export function resetConnection() {
  isConnected = false;
}
