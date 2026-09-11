import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { buildTicketAnalytics } from '../services/analyticsService.js';
import { getScopedTicketFilter } from '../services/ticketAccessService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getManagerDashboard = asyncHandler(async (req, res) => {
  const filter = getScopedTicketFilter(req.user);
  const [tickets, agents] = await Promise.all([
    Ticket.find(filter)
      .populate('customer', 'name email')
      .populate('department', 'name')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 }),
    User.find(req.user.role === 'admin' ? { role: 'agent' } : { role: 'agent', department: req.user.department })
      .select('name email department active')
      .populate('department', 'name')
      .sort('name')
  ]);

  const count = (predicate) => tickets.filter(predicate).length;
  const metrics = {
    totalTickets: tickets.length,
    openTickets: count((ticket) => ticket.status === 'OPEN'),
    assignedTickets: count((ticket) => ticket.status === 'ASSIGNED'),
    inProgressTickets: count((ticket) => ticket.status === 'IN_PROGRESS'),
    waitingTickets: count((ticket) => ticket.status === 'WAITING_FOR_CUSTOMER'),
    resolvedTickets: count((ticket) => ticket.status === 'RESOLVED'),
    unassignedTickets: count((ticket) => !ticket.assignedTo),
    highUrgentTickets: count((ticket) => ['HIGH', 'URGENT'].includes(ticket.priority))
  };

  const byStatus = {};
  const byPriority = {};
  tickets.forEach((ticket) => {
    byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
    byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
  });

  const workload = agents.map((agent) => {
    const assigned = tickets.filter((ticket) => ticket.assignedTo?._id?.equals(agent._id));
    return {
      id: agent._id,
      name: agent.name,
      email: agent.email,
      department: agent.department,
      active: agent.active,
      activeTickets: assigned.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length,
      waitingTickets: assigned.filter((ticket) => ticket.status === 'WAITING_FOR_CUSTOMER').length,
      resolvedTickets: assigned.filter((ticket) => ticket.status === 'RESOLVED').length
    };
  });

  res.json({ success: true, data: { metrics, byStatus, byPriority, workload } });
});

export const getManagerAnalytics = asyncHandler(async (req, res) => {
  const analytics = await buildTicketAnalytics(getScopedTicketFilter(req.user));
  res.json({ success: true, data: analytics });
});
