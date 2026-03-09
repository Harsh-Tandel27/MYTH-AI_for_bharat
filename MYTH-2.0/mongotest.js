import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// MongoDB database name
const DB_NAME = "test";

// MongoDB URL (password from env)
const MONGO_URI = `mongodb+srv://myth20:${process.env.MONGO_DB_PASS}@cluster0.pdpcegk.mongodb.net/${DB_NAME}?appName=Cluster0`;


// Schema
const TestSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Model
const TestModel = mongoose.model("TestData", TestSchema);

async function testMongoConnection() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB connected successfully!");

    // Sample JSON
    const sampleData = {
      name: "Myth Tester",
      email: "myth@test.com",
    };

    const savedData = await TestModel.create(sampleData);

    console.log("✅ Sample data inserted:");
    console.log(savedData);

    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error);
    process.exit(1);
  }
}

testMongoConnection();
