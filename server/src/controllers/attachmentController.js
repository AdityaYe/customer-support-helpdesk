import fs from 'fs';
import path from 'path';
import Attachment from '../models/Attachment.js';
import Message from '../models/Message.js';
import Ticket from '../models/Ticket.js';
import { uploadDir } from '../config/env.js';
import { canViewTicket, isSupportRole } from '../services/ticketAccessService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const populateTicket = (query) => query.populate('customer', 'name email').populate('department', 'name');

const getAuthorizedTicket = async (req) => {
  const ticket = await populateTicket(Ticket.findById(req.params.id));
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (!canViewTicket(req.user, ticket)) throw new AppError('You are not authorized to access this ticket', 403);
  return ticket;
};

export const listAttachments = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);
  const filter = { ticket: ticket._id };
  if (req.user.role === 'customer') filter.isInternal = false;

  const attachments = await Attachment.find(filter).populate('uploadedBy', 'name role').sort({ createdAt: -1 });
  res.json({ success: true, data: attachments });
});

export const uploadAttachments = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);
  const isInternal = isSupportRole(req.user) && req.body.isInternal === 'true';

  if (req.body.messageId) {
    const message = await Message.findOne({ _id: req.body.messageId, ticket: ticket._id });
    if (!message) throw new AppError('Message not found for this ticket', 400);
  }

  const attachments = await Attachment.create(
    (req.files || []).map((file) => ({
      ticket: ticket._id,
      message: req.body.messageId || null,
      uploadedBy: req.user._id,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      isInternal
    }))
  );

  res.status(201).json({ success: true, data: attachments });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const ticket = await getAuthorizedTicket(req);
  const attachment = await Attachment.findOne({ _id: req.params.attachmentId, ticket: ticket._id });

  if (!attachment) throw new AppError('Attachment not found', 404);
  if (req.user.role === 'customer' && attachment.isInternal) {
    throw new AppError('You are not authorized to access this attachment', 403);
  }

  const uploadRoot = path.resolve(uploadDir());
  const filePath = path.resolve(attachment.path);
  if (!filePath.startsWith(`${uploadRoot}${path.sep}`) && filePath !== uploadRoot) {
    throw new AppError('Attachment file is invalid', 400);
  }
  if (!fs.existsSync(filePath)) {
    throw new AppError('Attachment file is missing', 404);
  }

  res.download(filePath, attachment.originalName);
});
