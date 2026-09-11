import { body } from "express-validator";
import Message from "../models/Message.js";
import RequestType from "../models/RequestType.js";
import Satisfaction from "../models/Satisfaction.js";
import Ticket from "../models/Ticket.js";
import TicketActivity from "../models/TicketActivity.js";
import User from "../models/User.js";
import {
  canManageTicket,
  canViewTicket,
  canWorkTicket,
  isSupportRole,
} from "../services/ticketAccessService.js";
import { createTicketActivity } from "../services/ticketActivityService.js";
import {
  createNotification,
  notifyDepartmentManagers,
} from "../services/notificationService.js";
import {
  buildSlaDeadlines,
  formatRemaining,
  getSlaState,
  scheduleSlaJobs,
} from "../services/slaService.js";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  activityTypeForStatus,
  assertValidStatusTransition,
  getAllowedStatusTransitions,
} from "../services/ticketWorkflowService.js";
import { emitToDepartment, emitToUser } from "../socket.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";

const populateTicket = (query) =>
  query
    .populate("customer", "name email")
    .populate("department", "name")
    .populate("category", "name")
    .populate("requestType", "name formFields")
    .populate("assignedTo", "name email department");

const getTicketOrThrow = async (id) => {
  const ticket = await populateTicket(Ticket.findById(id));

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return ticket;
};

const ticketResponse = (ticket) => ({
  ...ticket.toObject(),
  allowedStatusTransitions: getAllowedStatusTransitions(ticket.status),
  sla: {
    state: getSlaState(ticket),
    remaining: formatRemaining(ticket),
  },
});

export const createTicketRules = [
  body("requestType").isMongoId().withMessage("Request type is required"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];

export const messageRules = [
  body("message").trim().notEmpty().withMessage("Message is required"),
];

export const satisfactionRules = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment is too long"),
];

export const createTicket = asyncHandler(async (req, res) => {
  const {
    requestType: requestTypeId,
    subject,
    description,
    customFields = {},
  } = req.body;

  const requestType = await RequestType.findOne({
    _id: requestTypeId,
    active: true,
  });

  if (!requestType) {
    throw new AppError("Request type not found", 404);
  }

  for (const field of requestType.formFields) {
    if (
      field.required &&
      (customFields[field.name] === undefined ||
        customFields[field.name] === "")
    ) {
      throw new AppError(`${field.label} is required`, 400);
    }
  }

  const ticket = await Ticket.create({
    ticketNumber: await generateTicketNumber(),
    customer: req.user._id,
    department: requestType.department,
    category: requestType.category,
    requestType: requestType._id,
    subject,
    description,
    customFields,
    status: "OPEN",
    priority: "MEDIUM",
    assignedTo: null,
    tags: [],
    ...buildSlaDeadlines("MEDIUM"),
  });

  await Message.create({
    ticket: ticket._id,
    sender: req.user._id,
    message: description,
    isInternal: false,
  });

  await createTicketActivity({
    ticket: ticket._id,
    actor: req.user._id,
    type: "TICKET_CREATED",
    toValue: ticket.ticketNumber,
  });

  await notifyDepartmentManagers({
    department: ticket.department,
    type: "TICKET_CREATED",
    title: "New ticket created",
    message: `${ticket.ticketNumber} was created in your department.`,
    ticket: ticket._id,
  });

  await scheduleSlaJobs(ticket);

  emitToDepartment(ticket.department, "ticket:updated", {
    ticketId: ticket._id,
  });

  const populated = await populateTicket(Ticket.findById(ticket._id));

  res.status(201).json({
    success: true,
    data: ticketResponse(populated),
  });
});

export const getMyTickets = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const filter = {
    customer: req.user._id,
  };

  if (status) {
    if (!TICKET_STATUSES.includes(status)) {
      throw new AppError("Invalid status filter", 400);
    }

    filter.status = status;
  }

  if (priority) {
    if (!TICKET_PRIORITIES.includes(priority)) {
      throw new AppError("Invalid priority filter", 400);
    }

    filter.priority = priority;
  }

  const [tickets, total] = await Promise.all([
    populateTicket(
      Ticket.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ),
    Ticket.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (!canViewTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to view this ticket", 403);
  }

  const messageQuery = {
    ticket: ticket._id,
  };

  if (req.user.role === "customer") {
    messageQuery.isInternal = false;
  }

  const messages = await Message.find(messageQuery)
    .populate("sender", "name role")
    .sort("createdAt");

  res.json({
    success: true,
    data: {
      ticket: ticketResponse(ticket),
      messages,
    },
  });
});

export const addMessage = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (!canWorkTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to update this ticket", 403);
  }

  if (req.user.role === "customer" && ticket.status === "CLOSED") {
    throw new AppError(
      "Closed tickets cannot receive customer replies. Please create a new support request.",
      400,
    );
  }

  const isInternal = isSupportRole(req.user) && Boolean(req.body.isInternal);

  const message = await Message.create({
    ticket: ticket._id,
    sender: req.user._id,
    message: req.body.message,
    isInternal,
  });

  await createTicketActivity({
    ticket: ticket._id,
    actor: req.user._id,
    type: isInternal ? "INTERNAL_NOTE_ADDED" : "MESSAGE_ADDED",
    customerVisible: !isInternal,
  });

  if (isSupportRole(req.user) && !isInternal && !ticket.firstResponseAt) {
    ticket.firstResponseAt = new Date();
    await ticket.save();
  }

  if (!isInternal) {
    if (req.user.role === "customer") {
      if (ticket.assignedTo?._id) {
        await createNotification({
          recipient: ticket.assignedTo._id,
          type: "TICKET_REPLIED",
          title: "Customer replied",
          message: `${ticket.ticketNumber} has a new customer reply.`,
          ticket: ticket._id,
        });
      }

      emitToDepartment(ticket.department._id, "message:created", {
        ticketId: ticket._id,
      });
    } else {
      await createNotification({
        recipient: ticket.customer._id,
        type: "TICKET_REPLIED",
        title: "Support replied",
        message: `${ticket.ticketNumber} has a new support reply.`,
        ticket: ticket._id,
      });

      emitToUser(ticket.customer._id, "message:created", {
        ticketId: ticket._id,
      });
    }
  }

  if (
    req.user.role === "customer" &&
    ticket.status === "WAITING_FOR_CUSTOMER"
  ) {
    const fromStatus = ticket.status;

    ticket.status = "REOPENED";
    await ticket.save();

    await createTicketActivity({
      ticket: ticket._id,
      actor: req.user._id,
      type: "REOPENED",
      fromValue: fromStatus,
      toValue: "REOPENED",
    });

    if (ticket.assignedTo?._id) {
      await createNotification({
        recipient: ticket.assignedTo._id,
        type: "TICKET_REOPENED",
        title: "Ticket reopened",
        message: `${ticket.ticketNumber} was reopened by the customer.`,
        ticket: ticket._id,
      });
    }

    emitToDepartment(ticket.department._id, "ticket:updated", {
      ticketId: ticket._id,
    });
  }

  const populated = await message.populate("sender", "name role");

  res.status(201).json({
    success: true,
    data: populated,
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);
  const nextStatus = req.body.status;

  if (!canManageTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to update this ticket", 403);
  }

  const transitionError = assertValidStatusTransition(
    ticket.status,
    nextStatus,
  );

  if (transitionError) {
    throw new AppError(transitionError, 400);
  }

  if (ticket.status !== nextStatus) {
    const fromStatus = ticket.status;

    ticket.status = nextStatus;

    if (nextStatus === "RESOLVED" && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    await createTicketActivity({
      ticket: ticket._id,
      actor: req.user._id,
      type: activityTypeForStatus(nextStatus),
      fromValue: fromStatus,
      toValue: nextStatus,
    });

    const notifyCustomerStatuses = {
      RESOLVED: ["TICKET_RESOLVED", "Ticket resolved"],
      CLOSED: ["TICKET_CLOSED", "Ticket closed"],
      REOPENED: ["TICKET_REOPENED", "Ticket reopened"],
    };

    if (notifyCustomerStatuses[nextStatus]) {
      const [type, title] = notifyCustomerStatuses[nextStatus];

      await createNotification({
        recipient: ticket.customer._id,
        type,
        title,
        message: `${ticket.ticketNumber} moved to ${nextStatus}.`,
        ticket: ticket._id,
      });
    }

    emitToUser(ticket.customer._id, "ticket:updated", {
      ticketId: ticket._id,
    });

    emitToDepartment(ticket.department._id, "ticket:updated", {
      ticketId: ticket._id,
    });
  }

  res.json({
    success: true,
    data: ticketResponse(await populateTicket(Ticket.findById(ticket._id))),
  });
});

export const updatePriority = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);
  const nextPriority = req.body.priority;

  if (!canManageTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to update this ticket", 403);
  }

  if (!TICKET_PRIORITIES.includes(nextPriority)) {
    throw new AppError("Invalid priority", 400);
  }

  if (ticket.priority !== nextPriority) {
    const fromPriority = ticket.priority;

    ticket.priority = nextPriority;

    const deadlines = buildSlaDeadlines(nextPriority, ticket.createdAt);
    ticket.slaResponseDueAt = deadlines.slaResponseDueAt;
    ticket.slaResolutionDueAt = deadlines.slaResolutionDueAt;

    await ticket.save();
    await scheduleSlaJobs(ticket);

    await createTicketActivity({
      ticket: ticket._id,
      actor: req.user._id,
      type: "PRIORITY_CHANGED",
      fromValue: fromPriority,
      toValue: nextPriority,
    });

    if (["HIGH", "URGENT"].includes(nextPriority)) {
      await notifyDepartmentManagers({
        department: ticket.department._id,
        type: "PRIORITY_CHANGED",
        title: "High priority ticket",
        message: `${ticket.ticketNumber} priority changed to ${nextPriority}.`,
        ticket: ticket._id,
      });
    }

    emitToUser(ticket.customer._id, "ticket:updated", {
      ticketId: ticket._id,
    });

    emitToDepartment(ticket.department._id, "ticket:updated", {
      ticketId: ticket._id,
    });
  }

  res.json({
    success: true,
    data: ticketResponse(await populateTicket(Ticket.findById(ticket._id))),
  });
});

export const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  const requestedAssignee = req.body.assignedTo || req.user._id;

  if (req.user.role === "customer") {
    throw new AppError("Customers cannot assign tickets", 403);
  }

  if (!canViewTicket(req.user, ticket)) {
    throw new AppError("You are not authorized to access this ticket", 403);
  }

  if (req.user.role === "agent") {
    if (requestedAssignee.toString() !== req.user._id.toString()) {
      throw new AppError("Agents can only assign tickets to themselves", 403);
    }

    if (ticket.assignedTo) {
      const currentAssignee =
        ticket.assignedTo._id?.toString() || ticket.assignedTo.toString();

      if (currentAssignee === req.user._id.toString()) {
        return res.json({
          success: true,
          data: ticketResponse(ticket),
        });
      }

      throw new AppError(
        "This ticket is already assigned to another agent",
        403,
      );
    }
  }

  if (
    req.user.role !== "agent" &&
    req.user.role !== "manager" &&
    req.user.role !== "admin"
  ) {
    throw new AppError("You are not authorized to assign this ticket", 403);
  }

  const assignee = await User.findOne({
    _id: requestedAssignee,
    role: "agent",
    active: true,
  }).select("_id name email role department");

  if (!assignee) {
    throw new AppError("Assignee must be a valid active agent", 400);
  }

  if (
    req.user.role !== "admin" &&
    assignee.department?.toString() !== ticket.department._id.toString()
  ) {
    throw new AppError("Assignee must belong to the ticket department", 403);
  }

  const previousAssignee =
    ticket.assignedTo?._id?.toString() || ticket.assignedTo?.toString() || null;

  if (previousAssignee === assignee._id.toString()) {
    return res.json({
      success: true,
      data: ticketResponse(ticket),
    });
  }

  ticket.assignedTo = assignee._id;

  if (ticket.status === "OPEN") {
    ticket.status = "ASSIGNED";
  }

  await ticket.save();

  await createTicketActivity({
    ticket: ticket._id,
    actor: req.user._id,
    type: previousAssignee ? "REASSIGNED" : "ASSIGNED",
    fromValue: previousAssignee,
    toValue: assignee._id.toString(),
    metadata: {
      assigneeName: assignee.name,
      assigneeEmail: assignee.email,
    },
  });

  await createNotification({
    recipient: assignee._id,
    type: "TICKET_ASSIGNED",
    title: "Ticket assigned",
    message: `${ticket.ticketNumber} is assigned to you.`,
    ticket: ticket._id,
  });

  emitToUser(assignee._id, "ticket:updated", {
    ticketId: ticket._id,
  });

  emitToDepartment(ticket.department._id, "ticket:updated", {
    ticketId: ticket._id,
  });

  res.json({
    success: true,
    data: ticketResponse(await populateTicket(Ticket.findById(ticket._id))),
  });
});

export const updateTags = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (!canManageTicket(req.user, ticket)) {
    throw new AppError(
      "You are not authorized to update tags for this ticket",
      403,
    );
  }

  if (!Array.isArray(req.body.tags)) {
    throw new AppError("Tags must be an array", 400);
  }

  const tags = [
    ...new Set(
      req.body.tags
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 10);

  const fromValue = ticket.tags.join(",");

  ticket.tags = tags;
  await ticket.save();

  await createTicketActivity({
    ticket: ticket._id,
    actor: req.user._id,
    type: "TAGS_CHANGED",
    fromValue,
    toValue: tags.join(","),
    customerVisible: false,
  });

  emitToDepartment(ticket.department._id, "ticket:updated", {
    ticketId: ticket._id,
  });

  res.json({
    success: true,
    data: ticketResponse(await populateTicket(Ticket.findById(ticket._id))),
  });
});

export const getTicketActivity = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (!canViewTicket(req.user, ticket)) {
    throw new AppError(
      "You are not authorized to view this ticket activity",
      403,
    );
  }

  const filter = {
    ticket: ticket._id,
  };

  if (req.user.role === "customer") {
    filter.customerVisible = true;
  }

  const activity = await TicketActivity.find(filter)
    .populate("actor", "name role")
    .sort("createdAt");

  res.json({
    success: true,
    data: activity,
  });
});

export const getSatisfaction = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (!canViewTicket(req.user, ticket)) {
    throw new AppError(
      "You are not authorized to view this satisfaction record",
      403,
    );
  }

  const satisfaction = await Satisfaction.findOne({
    ticket: ticket._id,
  }).populate("customer", "name email");

  res.json({
    success: true,
    data: satisfaction,
  });
});

export const submitSatisfaction = asyncHandler(async (req, res) => {
  const ticket = await getTicketOrThrow(req.params.id);

  if (
    req.user.role !== "customer" ||
    !ticket.customer._id.equals(req.user._id)
  ) {
    throw new AppError(
      "Only the ticket customer can submit satisfaction feedback",
      403,
    );
  }

  if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
    throw new AppError(
      "Feedback can only be submitted after a ticket is resolved or closed",
      400,
    );
  }

  const existing = await Satisfaction.findOne({
    ticket: ticket._id,
    customer: req.user._id,
  });

  if (existing) {
    throw new AppError(
      "Feedback has already been submitted for this ticket",
      409,
    );
  }

  const satisfaction = await Satisfaction.create({
    ticket: ticket._id,
    customer: req.user._id,
    rating: req.body.rating,
    comment: req.body.comment || "",
  });

  res.status(201).json({
    success: true,
    data: satisfaction,
  });
});
