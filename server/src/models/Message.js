import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ ticket: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
