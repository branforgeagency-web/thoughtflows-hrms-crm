import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thoughtflows_db', {
      serverSelectionTimeoutMS: 3000 // Quick timeout if MongoDB is not active locally
    });
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Notice] Local MongoDB server not reachable (${error.message}).`);
    console.warn(`[MongoDB Notice] Server is running in fallback/mock-data mode so all API endpoints function seamlessly.`);
    return false;
  }
};
