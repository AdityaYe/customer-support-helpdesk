export const statuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];

export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const statusClasses = {
  OPEN: "status-badge status-open",
  ASSIGNED: "status-badge status-assigned",
  IN_PROGRESS: "status-badge status-progress",
  WAITING_FOR_CUSTOMER: "status-badge status-waiting",
  RESOLVED: "status-badge status-resolved",
  CLOSED: "status-badge status-closed",
  REOPENED: "status-badge status-reopened",
};

const priorityClasses = {
  LOW: "priority-badge priority-low",
  MEDIUM: "priority-badge priority-medium",
  HIGH: "priority-badge priority-high",
  URGENT: "priority-badge priority-urgent",
};

export function statusBadgeClass(status) {
  return statusClasses[status] || "status-badge";
}

export function priorityBadgeClass(priority) {
  return priorityClasses[priority] || "priority-badge";
}

export function statusLabel(status) {
  if (!status) {
    return "Unknown";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function priorityLabel(priority) {
  if (!priority) {
    return "Unknown";
  }

  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function priorityWeight(priority) {
  const weights = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4,
  };

  return weights[priority] || 0;
}
