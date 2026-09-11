import Satisfaction from '../models/Satisfaction.js';
import Ticket from '../models/Ticket.js';
import { getSlaState } from './slaService.js';

const countBy = (items, keyFn) =>
  items.reduce((acc, item) => {
    const key = keyFn(item) || 'Unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

export const buildTicketAnalytics = async (filter = {}) => {
  const tickets = await Ticket.find(filter)
    .populate('department', 'name')
    .populate('category', 'name')
    .populate('assignedTo', 'name email');

  const satisfactions = await Satisfaction.find({
    ticket: { $in: tickets.map((ticket) => ticket._id) }
  }).select('rating');

  const averageSatisfaction =
    satisfactions.length === 0
      ? null
      : Number((satisfactions.reduce((sum, item) => sum + item.rating, 0) / satisfactions.length).toFixed(2));

  const slaStates = tickets.map((ticket) => getSlaState(ticket));

  return {
    totalTickets: tickets.length,
    openTickets: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    resolvedTickets: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    closedTickets: tickets.filter((ticket) => ticket.status === 'CLOSED').length,
    unassignedTickets: tickets.filter((ticket) => !ticket.assignedTo).length,
    ticketsByDepartment: countBy(tickets, (ticket) => ticket.department?.name),
    ticketsByCategory: countBy(tickets, (ticket) => ticket.category?.name),
    ticketsByPriority: countBy(tickets, (ticket) => ticket.priority),
    ticketsByStatus: countBy(tickets, (ticket) => ticket.status),
    ticketsByAgent: countBy(tickets, (ticket) => ticket.assignedTo?.name),
    slaAtRisk: slaStates.filter((state) => state === 'AT_RISK').length,
    slaBreached: slaStates.filter((state) => state === 'BREACHED').length,
    averageSatisfaction
  };
};
