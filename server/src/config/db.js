import mongoose from 'mongoose';
import { requireEnv } from './env.js';

export const connectDB = async () => {
  const uri = requireEnv('MONGODB_URI');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
