import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_REPLIED', 'TICKET_REOPENED', 'TICKET_RESOLVED', 'TICKET_CLOSED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'SLA_RESPONSE_BREACHED', 'SLA_RESOLUTION_BREACHED'],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
