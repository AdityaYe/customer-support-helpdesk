import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { getScopedTicketFilter } from '../services/ticketAccessService.js';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES
} from '../services/ticketWorkflowService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildTicketQuery = async (req) => {
  const { status, priority, assignedTo, search } = req.query;

  const filter = getScopedTicketFilter(req.user);

  if (status) {
    if (!TICKET_STATUSES.includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }

    filter.status = status;
  }

  if (priority) {
    if (!TICKET_PRIORITIES.includes(priority)) {
      throw new AppError('Invalid priority filter', 400);
    }

    filter.priority = priority;
  }

  if (assignedTo === 'unassigned') {
    filter.assignedTo = null;
  } else if (assignedTo === 'me') {
    filter.assignedTo = req.user._id;
  } else if (assignedTo) {
    if (req.user.role === 'agent') {
      throw new AppError(
        'Agents can only filter their own assigned tickets or unassigned tickets',
        403
      );
    }

    filter.assignedTo = assignedTo;
  }

  if (search?.trim()) {
    const term = search.trim();

    const matchingUsers = await User.find({
      $or: [
        {
          name: {
            $regex: term,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: term,
            $options: 'i'
          }
        }
      ]
    }).select('_id');

    filter.$or = [
      {
        ticketNumber: {
          $regex: term,
          $options: 'i'
        }
      },
      {
        subject: {
          $regex: term,
          $options: 'i'
        }
      },
      {
        customer: {
          $in: matchingUsers.map(
            (user) => user._id
          )
        }
      }
    ];
  }

  return filter;
};

export const getAgentTickets = asyncHandler(
  async (req, res) => {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      50
    );

    const filter = await buildTicketQuery(req);
    const baseFilter = getScopedTicketFilter(
      req.user
    );

    const [
      tickets,
      total,
      queueTickets
    ] = await Promise.all([
      Ticket.find(filter)
        .populate(
          'customer',
          'name email'
        )
        .populate(
          'department',
          'name'
        )
        .populate(
          'category',
          'name'
        )
        .populate(
          'requestType',
          'name'
        )
        .populate(
          'assignedTo',
          'name email'
        )
        .sort({
          updatedAt: -1
        })
        .skip(
          (page - 1) * limit
        )
        .limit(limit),

      Ticket.countDocuments(filter),

      Ticket.find(baseFilter)
        .select('status assignedTo')
    ]);

    const summary = {
      totalOpen: queueTickets.filter(
        (ticket) =>
          ticket.status === 'OPEN'
      ).length,

      myTickets: queueTickets.filter(
        (ticket) =>
          ticket.assignedTo?.equals(
            req.user._id
          )
      ).length,

      waitingTickets: queueTickets.filter(
        (ticket) =>
          ticket.status ===
          'WAITING_FOR_CUSTOMER'
      ).length,

      resolvedTickets: queueTickets.filter(
        (ticket) =>
          ticket.status === 'RESOLVED'
      ).length
    };

    res.json({
      success: true,
      data: {
        summary,
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(total / limit) || 1
        }
      }
    });
  }
);

export const getAssignableAgents =
  asyncHandler(async (req, res) => {
    const filter = {
      role: 'agent',
      active: true
    };

    if (req.user.role !== 'admin') {
      filter.department =
        req.user.department;
    }

    const agents = await User.find(filter)
      .select(
        'name email role department active'
      )
      .populate(
        'department',
        'name'
      )
      .sort('name');

    res.json({
      success: true,
      data: agents
    });
  });
