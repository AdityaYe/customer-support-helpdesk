import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api.js";
import { formatDate, titleStatus } from "../utils/format.js";
import {
  priorities,
  priorityBadgeClass,
  statusBadgeClass,
  statuses,
} from "../utils/ticketOptions.js";

export default function AgentDashboardPage() {
  const { socket } = useSocket();

  const [queue, setQueue] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignedTo: "",
    page: 1,
  });

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await api.get(`/agent/tickets?${params.toString()}`);

      setQueue(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load your support queue.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await api.get("/agent/agents");
      setAgents(response.data.data || []);
    } catch {
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filters]);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const reload = () => {
      loadQueue();
    };

    socket.on("ticket:updated", reload);
    socket.on("message:created", reload);
    socket.on("notification:created", reload);

    return () => {
      socket.off("ticket:updated", reload);
      socket.off("message:created", reload);
      socket.off("notification:created", reload);
    };
  }, [socket, filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      priority: "",
      assignedTo: "",
      page: 1,
    });
  };

  const tickets = queue?.tickets || queue?.data || [];

  const pagination = queue?.pagination || {
    page: 1,
    totalPages: 1,
    total: tickets.length,
  };

  const summary = useMemo(() => {
    const total = tickets.length;

    const open = tickets.filter(
      (ticket) => ticket.status === "OPEN" || ticket.status === "REOPENED",
    ).length;

    const inProgress = tickets.filter(
      (ticket) => ticket.status === "IN_PROGRESS",
    ).length;

    const waiting = tickets.filter(
      (ticket) => ticket.status === "WAITING_FOR_CUSTOMER",
    ).length;

    const urgent = tickets.filter(
      (ticket) => ticket.priority === "URGENT" || ticket.priority === "HIGH",
    ).length;

    const unassigned = tickets.filter((ticket) => !ticket.assignedTo).length;

    return {
      total,
      open,
      inProgress,
      waiting,
      urgent,
      unassigned,
    };
  }, [tickets]);

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assignedTo,
  ].filter(Boolean).length;

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Agent queue
        </h1>
      </div>

      <ErrorState message={error} />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Visible tickets",
            value: summary.total,
            icon: BriefcaseBusiness,
          },
          {
            label: "Open",
            value: summary.open,
            icon: Clock3,
          },
          {
            label: "In progress",
            value: summary.inProgress,
            icon: UserCheck,
          },
          {
            label: "High / urgent",
            value: summary.urgent,
            icon: Clock3,
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {card.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Department queue
        </h2>

        <p className="shrink-0 text-xs font-medium text-slate-400">
          {activeFilterCount} filter
          {activeFilterCount !== 1 ? "s" : ""} applied
        </p>
      </div>

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="search-shell search-shell-flat min-w-0 flex-1 lg:min-w-[280px]">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />

              <input
                className="search-input"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search tickets..."
              />
            </div>

            <select
              className="field lg:w-[155px]"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>

              {statuses.map((status) => (
                <option key={status} value={status}>
                  {titleStatus(status)}
                </option>
              ))}
            </select>

            <select
              className="field lg:w-[145px]"
              value={filters.priority}
              onChange={(event) => updateFilter("priority", event.target.value)}
            >
              <option value="">All priorities</option>

              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {titleStatus(priority)}
                </option>
              ))}
            </select>

            <select
              className="field lg:w-[160px]"
              value={filters.assignedTo}
              onChange={(event) =>
                updateFilter("assignedTo", event.target.value)
              }
            >
              <option value="">All assignments</option>
              <option value="Assigned to me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>

              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>
                  {agent.name}
                </option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary shrink-0"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>


        {loading && !queue ? (
          <div className="p-8">
            <LoadingState label="Loading support queue..." />
          </div>
        ) : tickets.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ticket
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Priority
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assigned
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Updated
                    </th>

                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => {
                    const assignedToMe =
                      ticket.assignedTo?._id === ticket.assignedTo?.id;

                    return (
                      <tr
                        key={ticket._id}
                        className="group hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5">
                          <Link
                            to={`/tickets/${ticket._id}`}
                            className="block max-w-[330px]"
                          >
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              {ticket.ticketNumber || ticket._id}
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                              {ticket.subject}
                            </p>
                          </Link>
                        </td>

                        <td className="px-6 py-5">
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {ticket.customer?.name || "Unknown customer"}
                            </p>

                            {ticket.customer?.email && (
                              <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                                {ticket.customer.email}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`badge ${statusBadgeClass(
                              ticket.status,
                            )}`}
                          >
                            {titleStatus(ticket.status)}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`badge ${priorityBadgeClass(
                              ticket.priority,
                            )}`}
                          >
                            {titleStatus(ticket.priority)}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {ticket.assignedTo ? (
                            <span
                              className={`inline-flex items-center gap-2 text-sm ${
                                assignedToMe
                                  ? "font-semibold text-teal-700"
                                  : "text-slate-600"
                              }`}
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <UserCheck className="h-3.5 w-3.5" />
                              </span>

                              {ticket.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-slate-400">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                          {formatDate(ticket.updatedAt)}
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            to={`/tickets/${ticket._id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Open ${
                              ticket.ticketNumber || ticket._id
                            }`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {tickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  to={`/tickets/${ticket._id}`}
                  className="block p-5 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {ticket.ticketNumber || ticket._id}
                      </p>

                      <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {ticket.subject}
                      </h3>
                    </div>

                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`badge ${statusBadgeClass(ticket.status)}`}
                    >
                      {titleStatus(ticket.status)}
                    </span>

                    <span
                      className={`badge ${priorityBadgeClass(ticket.priority)}`}
                    >
                      {titleStatus(ticket.priority)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{ticket.assignedTo?.name || "Unassigned"}</span>

                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-sm text-slate-500">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  disabled={(pagination.page || 1) <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  disabled={
                    (pagination.page || 1) >= (pagination.totalPages || 1)
                  }
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No tickets found
            </h3>
          </div>
        )}
      </section>
    </div>
  );
}
