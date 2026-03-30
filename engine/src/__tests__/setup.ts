import mongoose from "mongoose";
import { connectDB, resetConnection } from "../db.js";

export async function setupDB() {
  process.env.MONGODB_URI = "mongodb://localhost:27017/galaxyex_test";
  process.env.JWT_SECRET = "test-secret-for-vitest";
  resetConnection();
  await connectDB();
}

export async function teardownDB() {
  await mongoose.connection.close();
  resetConnection();
}

export async function cleanDB() {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.listCollections().toArray();
  await Promise.all(
    collections.map((col) => db.collection(col.name).deleteMany({}))
  );
}
