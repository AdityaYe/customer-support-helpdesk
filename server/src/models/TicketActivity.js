import mongoose from 'mongoose';

const ticketActivitySchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'TICKET_CREATED',
        'ASSIGNED',
        'REASSIGNED',
        'STATUS_CHANGED',
        'PRIORITY_CHANGED',
        'MESSAGE_ADDED',
        'INTERNAL_NOTE_ADDED',
        'TAGS_CHANGED',
        'RESOLVED',
        'CLOSED',
        'REOPENED'
      ],
      required: true
    },
    fromValue: { type: String, default: null },
    toValue: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    customerVisible: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ticketActivitySchema.index({ ticket: 1, createdAt: 1 });

export default mongoose.model('TicketActivity', ticketActivitySchema);
