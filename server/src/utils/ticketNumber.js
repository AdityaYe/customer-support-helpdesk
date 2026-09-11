import Ticket from '../models/Ticket.js';
import Counter from '../models/Counter.js';

export const generateTicketNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'ticket' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `TK-${counter.sequence}`;
};

export const syncTicketCounter = async () => {
  const tickets = await Ticket.find().select('ticketNumber');
  const maxTicketNumber = tickets.reduce((max, ticket) => {
    const value = Number(String(ticket.ticketNumber).replace('TK-', ''));
    return Number.isFinite(value) && value > max ? value : max;
  }, 10000);

  await Counter.findOneAndUpdate(
    { name: 'ticket' },
    { $max: { sequence: maxTicketNumber } },
    { upsert: true, setDefaultsOnInsert: true }
  );
};
