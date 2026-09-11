import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true, default: 10000 }
});

export default mongoose.model('Counter', counterSchema);
