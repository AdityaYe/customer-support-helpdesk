import TicketActivity from '../models/TicketActivity.js';

export const createTicketActivity = ({
  ticket,
  actor,
  type,
  fromValue = null,
  toValue = null,
  metadata = {},
  customerVisible = true
}) => {
  return TicketActivity.create({
    ticket,
    actor,
    type,
    fromValue,
    toValue,
    metadata,
    customerVisible
  });
};
