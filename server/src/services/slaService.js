import { slaQueue } from '../queues/slaQueue.js';

export const SLA_TARGETS = {
  LOW: { responseHours: 24, resolutionHours: 72 },
  MEDIUM: { responseHours: 12, resolutionHours: 48 },
  HIGH: { responseHours: 4, resolutionHours: 24 },
  URGENT: { responseHours: 1, resolutionHours: 8 }
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

export const buildSlaDeadlines = (priority = 'MEDIUM', from = new Date()) => {
  const target = SLA_TARGETS[priority] || SLA_TARGETS.MEDIUM;
  return {
    slaResponseDueAt: addHours(from, target.responseHours),
    slaResolutionDueAt: addHours(from, target.resolutionHours)
  };
};

export const getSlaState = (ticket, now = new Date()) => {
  if (ticket.resolvedAt) return 'COMPLETED';

  const responseDue = ticket.slaResponseDueAt ? new Date(ticket.slaResponseDueAt) : null;
  const resolutionDue = ticket.slaResolutionDueAt ? new Date(ticket.slaResolutionDueAt) : null;
  const responseBreached = !ticket.firstResponseAt && responseDue && now > responseDue;
  const resolutionBreached = resolutionDue && now > resolutionDue;

  if (responseBreached || resolutionBreached) return 'BREACHED';

  const nextDue = !ticket.firstResponseAt && responseDue && responseDue < resolutionDue ? responseDue : resolutionDue;
  if (!nextDue) return 'ON_TRACK';

  const remainingMs = nextDue.getTime() - now.getTime();
  if (remainingMs <= 2 * 60 * 60 * 1000) return 'AT_RISK';
  return 'ON_TRACK';
};

export const formatRemaining = (ticket, now = new Date()) => {
  if (ticket.resolvedAt) return 'Completed';
  const nextDue = !ticket.firstResponseAt ? ticket.slaResponseDueAt : ticket.slaResolutionDueAt;
  if (!nextDue) return 'Not set';

  const diffMs = new Date(nextDue).getTime() - now.getTime();
  if (diffMs <= 0) return 'SLA breached';

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m remaining`;
};

export const scheduleSlaJobs = async (ticket) => {
  const jobs = [];
  const now = Date.now();
  const ticketId = ticket._id.toString();

  if (ticket.slaResponseDueAt) {
    jobs.push(
      slaQueue.add(
        'check-response',
        { ticketId },
        {
          delay: Math.max(0, new Date(ticket.slaResponseDueAt).getTime() - now),
          jobId: `${ticketId}:response:${new Date(ticket.slaResponseDueAt).getTime()}`
        }
      )
    );
  }

  if (ticket.slaResolutionDueAt) {
    jobs.push(
      slaQueue.add(
        'check-resolution',
        { ticketId },
        {
          delay: Math.max(0, new Date(ticket.slaResolutionDueAt).getTime() - now),
          jobId: `${ticketId}:resolution:${new Date(ticket.slaResolutionDueAt).getTime()}`
        }
      )
    );
  }

  return Promise.all(jobs);
};
