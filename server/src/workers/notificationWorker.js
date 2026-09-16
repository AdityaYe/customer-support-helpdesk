import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "../socket.js";
import { sendNotificationEmail } from "../services/emailService.js";

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { recipient, type, title, message, ticket = null } = job.data;

    if (!recipient) return null;

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

    const recipientUser = await User.findById(recipient).select("name email");

    if (recipientUser?.email) {
      try {
        await sendNotificationEmail({
          to: recipientUser.email,
          subject: title,
          title,
          message,
          ticketNumber: populated.ticket?.ticketNumber,
        });
      } catch (error) {
        console.error(
          `Notification email failed for ${recipientUser.email}:`,
          error.message,
        );
      }
    }

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