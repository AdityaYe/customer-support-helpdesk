const sameId = (a, b) => {
  if (!a || !b) return false;
  return a.toString() === b.toString();
};

export const isSupportRole = (user) => ['agent', 'manager', 'admin'].includes(user.role);

export const getTicketDepartmentId = (ticket) => ticket.department?._id || ticket.department;
export const getTicketCustomerId = (ticket) => ticket.customer?._id || ticket.customer;

export const canViewTicket = (user, ticket) => {
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return sameId(getTicketCustomerId(ticket), user._id);
  if (user.role === 'agent' || user.role === 'manager') return sameId(getTicketDepartmentId(ticket), user.department);
  return false;
};

export const canWorkTicket = (user, ticket) => {
  if (user.role === 'admin') return true;

  if (user.role === 'customer') {
    return sameId(getTicketCustomerId(ticket), user._id);
  }

  if (user.role === 'manager') {
    return sameId(getTicketDepartmentId(ticket), user.department);
  }

  if (user.role === 'agent') {
    return (
      sameId(getTicketDepartmentId(ticket), user.department) &&
      sameId(ticket.assignedTo?._id || ticket.assignedTo, user._id)
    );
  }

  return false;
};

export const canManageTicket = (user, ticket) => {
  if (user.role === 'admin') return true;

  if (user.role === 'manager') {
    return sameId(getTicketDepartmentId(ticket), user.department);
  }

  if (user.role === 'agent') {
    return (
      sameId(getTicketDepartmentId(ticket), user.department) &&
      sameId(ticket.assignedTo?._id || ticket.assignedTo, user._id)
    );
  }

  return false;
};

export const getScopedTicketFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'agent' || user.role === 'manager') {
    return { department: user.department };
  }
  return { customer: user._id };
};
