import mongoose from "mongoose";

const savedReplySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    active: {
      type: Boolean,
      default: true,
    },

    scope: {
      type: String,
      enum: ["PERSONAL", "DEPARTMENT", "GLOBAL"],
      default: "GLOBAL",
      index: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

savedReplySchema.index({ active: 1, title: 1 });
savedReplySchema.index({ scope: 1, department: 1, active: 1 });
savedReplySchema.index({ scope: 1, createdBy: 1 });

export default mongoose.model("SavedReply", savedReplySchema);
