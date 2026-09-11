import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    requestType: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestType', required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'],
      default: 'OPEN'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true, lowercase: true }],
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    slaResponseDueAt: { type: Date, default: null },
    slaResolutionDueAt: { type: Date, default: null }
  },
  { timestamps: true }
);

ticketSchema.index({ customer: 1, updatedAt: -1 });
ticketSchema.index({ department: 1, status: 1, priority: 1, updatedAt: -1 });
ticketSchema.index({ assignedTo: 1, updatedAt: -1 });
ticketSchema.index({ slaResponseDueAt: 1, slaResolutionDueAt: 1 });

export default mongoose.model('Ticket', ticketSchema);
