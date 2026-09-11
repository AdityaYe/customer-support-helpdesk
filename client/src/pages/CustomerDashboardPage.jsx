import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Ticket,
  X,
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

export default function CustomerDashboardPage() {
  const { socket } = useSocket();

  const [tickets, setTickets] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    page: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (filters.search.trim()) {
        params.set("search", filters.search.trim());
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      if (filters.priority) {
        params.set("priority", filters.priority);
      }

      params.set("page", String(filters.page));

      const response = await api.get(`/tickets/my?${params.toString()}`);

      setTickets(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  useEffect(() => {
    if (!socket) return;

    const reload = () => loadTickets();

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
      page: 1,
    });
  };

  const pagination = tickets?.pagination || {
    page: 1,
    totalPages: 1,
    total: 0,
  };

  const ticketList = tickets?.tickets || tickets?.data || [];

  const activeFilterCount = useMemo(
    () => [filters.status, filters.priority].filter(Boolean).length,
    [filters.status, filters.priority],
  );

  const hasFilters = filters.search || filters.status || filters.priority;

  if (loading && !tickets) {
    return <LoadingState />;
  }

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          My tickets
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track your support requests and conversations.
        </p>
      </div>

      <ErrorState message={error} />

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">
              {pagination.total ?? ticketList.length} requests
            </span>

            {activeFilterCount > 0 && (
              <span className="text-slate-400">
                · {activeFilterCount} filter
                {activeFilterCount > 1 ? "s" : ""} applied
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="search-shell search-shell-flat sm:w-[240px]">
              <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

              <input
                className="search-input text-slate-800"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search tickets..."
              />
            </div>

            <div className="flex gap-2">
              <select
                className="field min-w-[130px]"
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="">All statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {titleStatus(status)}
                  </option>
                ))}
              </select>

              <select
                className="field min-w-[120px]"
                value={filters.priority}
                onChange={(e) => updateFilter("priority", e.target.value)}
              >
                <option value="">All priorities</option>

                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {titleStatus(priority)}
                  </option>
                ))}
              </select>

              {(filters.status || filters.priority) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  title="Clear filters"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {ticketList.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-slate-400">
                      Ticket
                    </th>

                    <th className="px-6 py-3 text-xs font-medium text-slate-400">
                      Department
                    </th>

                    <th className="px-6 py-3 text-xs font-medium text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-3 text-xs font-medium text-slate-400">
                      Priority
                    </th>

                    <th className="px-6 py-3 text-xs font-medium text-slate-400">
                      Updated
                    </th>

                    <th className="px-6 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {ticketList.map((ticket) => (
                    <tr
                      key={ticket._id}
                      className="group transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/tickets/${ticket._id}`}
                          className="block max-w-[340px]"
                        >
                          <p className="text-xs font-medium text-slate-400">
                            {ticket.ticketNumber || ticket._id}
                          </p>

                          <p className="mt-0.5 truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">
                            {ticket.subject}
                          </p>
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {ticket.department?.name || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`badge ${statusBadgeClass(ticket.status)}`}
                        >
                          {titleStatus(ticket.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`badge ${priorityBadgeClass(
                            ticket.priority,
                          )}`}
                        >
                          {titleStatus(ticket.priority)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                        {formatDate(ticket.updatedAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tickets/${ticket._id}`}
                          aria-label={`View ticket ${
                            ticket.ticketNumber || ticket._id
                          }`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {ticketList.map((ticket) => (
                <Link
                  key={ticket._id}
                  to={`/tickets/${ticket._id}`}
                  className="block p-5 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400">
                        {ticket.ticketNumber || ticket._id}
                      </p>

                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">
                        {ticket.subject}
                      </h3>
                    </div>

                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
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

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{ticket.department?.name || "—"}</span>
                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 sm:px-6">
              <p className="text-xs text-slate-400">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary h-8 px-3 text-xs"
                  disabled={(pagination.page || 1) <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <button
                  type="button"
                  className="btn-secondary h-8 px-3 text-xs"
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
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Ticket className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              {hasFilters ? "No matching tickets" : "No tickets yet"}
            </h3>

            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Your support requests will appear here once created."}
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary mt-5"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {loading && tickets && (
        <p className="mt-3 text-center text-xs text-slate-400">Refreshing...</p>
      )}
    </div>
  );
}
