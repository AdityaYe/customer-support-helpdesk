import mongoose from 'mongoose';

const satisfactionSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

satisfactionSchema.index({ ticket: 1, customer: 1 }, { unique: true });

export default mongoose.model('Satisfaction', satisfactionSchema);
