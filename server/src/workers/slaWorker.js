import { Worker } from "bullmq";

import redisConnection from "../config/redis.js";
import Notification from "../models/Notification.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { emitToUser } from "../socket.js";

const terminalStatuses = new Set(["RESOLVED", "CLOSED"]);

const createOnce = async ({ recipient, type, title, message, ticket }) => {
  if (!recipient) return null;

  const existing = await Notification.findOne({
    recipient,
    type,
    ticket,
  });

  if (existing) return existing;

  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    ticket,
  });

  const populated = await notification.populate(
    "ticket",
    "ticketNumber subject status priority",
  );

  emitToUser(recipient, "notification:created", populated);

  return populated;
};

const getRecipients = async (ticket) => {
  const recipients = new Set();

  if (ticket.assignedTo) {
    recipients.add(ticket.assignedTo.toString());
  }

  const managers = await User.find({
    role: "manager",
    department: ticket.department,
    active: true,
  }).select("_id");

  managers.forEach((manager) => recipients.add(manager._id.toString()));

  return [...recipients];
};

const slaWorker = new Worker(
  "sla",
  async (job) => {
    const ticket = await Ticket.findById(job.data.ticketId);

    if (!ticket || terminalStatuses.has(ticket.status)) {
      return null;
    }

    if (job.name === "check-response" && ticket.firstResponseAt) {
      return null;
    }

    const isResponseJob = job.name === "check-response";
    const dueAt = isResponseJob
      ? ticket.slaResponseDueAt
      : ticket.slaResolutionDueAt;

    if (!dueAt || new Date() < new Date(dueAt)) {
      return null;
    }

    const type = isResponseJob
      ? "SLA_RESPONSE_BREACHED"
      : "SLA_RESOLUTION_BREACHED";
    const title = isResponseJob
      ? "SLA response breached"
      : "SLA resolution breached";
    const message = isResponseJob
      ? `${ticket.ticketNumber} missed its first response target.`
      : `${ticket.ticketNumber} missed its resolution target.`;
    const recipients = await getRecipients(ticket);

    return Promise.all(
      recipients.map((recipient) =>
        createOnce({
          recipient,
          type,
          title,
          message,
          ticket: ticket._id,
        }),
      ),
    );
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

slaWorker.on("failed", (job, error) => {
  console.error(
    `SLA job ${job?.id || "unknown"} failed:`,
    error.message,
  );
});

export default slaWorker;
