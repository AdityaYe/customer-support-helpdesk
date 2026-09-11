export const TICKET_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'];
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const transitions = {
  OPEN: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED'],
  WAITING_FOR_CUSTOMER: ['REOPENED', 'RESOLVED'],
  REOPENED: ['IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: []
};

export const canTransitionStatus = (currentStatus, newStatus) => {
  return transitions[currentStatus]?.includes(newStatus) || false;
};

export const getAllowedStatusTransitions = (currentStatus) => {
  return transitions[currentStatus] || [];
};

export const assertValidStatusTransition = (currentStatus, newStatus) => {
  if (!TICKET_STATUSES.includes(newStatus)) {
    return 'Invalid status.';
  }

  if (currentStatus === newStatus) {
    return null;
  }

  if (!canTransitionStatus(currentStatus, newStatus)) {
    return `Ticket cannot move from ${currentStatus} directly to ${newStatus}.`;
  }

  return null;
};

export const activityTypeForStatus = (status) => {
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'REOPENED') return 'REOPENED';
  return 'STATUS_CHANGED';
};
