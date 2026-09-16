import { Resend } from "resend";
import { getEnv } from "../config/env.js";

const apiKey = getEnv("RESEND_API_KEY");
const fromEmail = getEnv("RESEND_FROM_EMAIL");

const resend = apiKey ? new Resend(apiKey) : null;

export const sendNotificationEmail = async ({
  to,
  subject,
  title,
  message,
  ticketNumber,
}) => {
  if (!resend || !fromEmail || !to) {
    return null;
  }

  const ticketLine = ticketNumber
    ? `<p style="margin:0 0 16px;color:#64748b;font-size:14px;"><strong>Ticket:</strong> ${ticketNumber}</p>`
    : "";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#0f172a;">
        <h2 style="margin:0 0 16px;">${title}</h2>
        ${ticketLine}
        <p style="margin:0;color:#475569;line-height:1.7;">
          ${message}
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Email could not be sent");
  }

  return data;
};