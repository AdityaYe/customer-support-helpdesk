import { Worker } from "bullmq";

import Notification from "../models/Notification.js";

import redisConnection from "../config/redis.js";
import { emitToUser } from "../socket.js";

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { recipient, type, title, message, ticket = null } = job.data;

    if (!recipient) {
      return null;
    }

    if (ticket && type === "TICKET_ASSIGNED") {
      const existing = await Notification.findOne({
        recipient,
        type,
        ticket,
        message,
      }).sort({ createdAt: -1 });

      if (existing) {
        const ageMs = Date.now() - existing.createdAt.getTime();

        if (ageMs < 30 * 1000) {
          return existing;
        }
      }
    }

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
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

notificationWorker.on("failed", (job, error) => {
  console.error(
    `Notification job ${job?.id || "unknown"} failed:`,
    error.message,
  );
});

export default notificationWorker;
