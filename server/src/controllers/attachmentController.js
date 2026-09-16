import Attachment from "../models/Attachment.js";
import Message from "../models/Message.js";
import Ticket from "../models/Ticket.js";
import cloudinary from "../config/cloudinary.js";
import {
  canViewTicket,
  isSupportRole,
} from "../services/ticketAccessService.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const populateTicket = (query) =>
  query.populate("customer", "name email").populate("department", "name");

const getAuthorizedTicket = async (req) => {
  const ticket = await populateTicket(Ticket.findById(req.params.id));

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  if (!canViewTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to access this ticket", 403);
  }

  return ticket;
};

const uploadToCloudinary = (file, ticketId) =>
  new Promise((resolve, reject) => {
    const extension = file.originalname.includes(".")
      ? `.${file.originalname.split(".").pop().toLowerCase()}`
      : "";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "raw",
        public_id: `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(file.buffer);
  });

export const listAttachments = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);

  const filter = { ticket: ticket._id };

  if (req.user.role === "customer") {
    filter.isInternal = false;
  }

  const attachments = await Attachment.find(filter)
    .populate("uploadedBy", "name role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: attachments,
  });
});

export const uploadAttachments = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);
  const isInternal = isSupportRole(req.user) && req.body.isInternal === "true";

  if (req.body.messageId) {
    const message = await Message.findOne({
      _id: req.body.messageId,
      ticket: ticket._id,
    });

    if (!message) {
      throw new AppError("Message not found for this ticket", 400);
    }
  }

  const files = req.files || [];

  if (files.length === 0) {
    throw new AppError("No files were uploaded", 400);
  }

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      try {
        const result = await uploadToCloudinary(file, ticket._id);

        return {
          ticket: ticket._id,
          message: req.body.messageId || null,
          uploadedBy: req.user._id,
          originalName: file.originalname,
          storedName: result.public_id,
          mimeType: file.mimetype,
          size: file.size,
          path: result.secure_url,
          isInternal,
        };
      } catch (error) {
        throw new AppError(`Could not upload ${file.originalname}`, 500);
      }
    }),
  );

  const attachments = await Attachment.create(uploadedFiles);

  res.status(201).json({
    success: true,
    data: attachments,
  });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);

  const attachment = await Attachment.findOne({
    _id: req.params.attachmentId,
    ticket: ticket._id,
  });

  if (!attachment) {
    throw new AppError("Attachment not found", 404);
  }

  if (req.user.role === "customer" && attachment.isInternal) {
    throw new AppError("You are not authorized to access this attachment", 403);
  }

  if (!attachment.path) {
    throw new AppError("Attachment file is unavailable", 404);
  }

  res.redirect(attachment.path);
});
