import mongoose from 'mongoose';

const formFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select', 'textarea', 'date'], default: 'text' },
    required: { type: Boolean, default: false },
    options: [{ type: String }]
  },
  { _id: false }
);

const requestTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    faqTitle: { type: String, required: true },
    faqContent: { type: String, required: true },
    formFields: [formFieldSchema],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('RequestType', requestTypeSchema);
