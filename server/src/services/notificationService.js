import User from "../models/User.js";

import { notificationQueue } from "../queues/notificationQueue.js";

export const createNotification = async ({
  recipient,
  type,
  title,
  message,
  ticket = null,
}) => {
  if (!recipient) return null;

  const job = await notificationQueue.add("create-notification", {
    recipient: recipient.toString(),
    type,
    title,
    message,
    ticket: ticket ? ticket.toString() : null,
  });

  return job;
};

export const notifyDepartmentManagers = async ({
  department,
  type,
  title,
  message,
  ticket = null,
}) => {
  if (!department) return [];

  const managers = await User.find({
    role: "manager",
    department,
    active: true,
  }).select("_id");

  return Promise.all(
    managers.map((manager) =>
      createNotification({
        recipient: manager._id,
        type,
        title,
        message,
        ticket,
      }),
    ),
  );
};
