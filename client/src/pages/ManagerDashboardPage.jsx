import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const safeNumber = (value) =>
  typeof value === "number" ? value : Number(value || 0);

const percent = (value, total) => {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
};

export default function ManagerDashboardPage() {
  const { socket } = useSocket();

  const queueScrollRef = useRef(null);
  const isDraggingQueue = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const suppressClick = useRef(false);

  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [queue, setQueue] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignedTo: "",
    page: 1,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, analyticsRes] = await Promise.all([
        api.get("/manager/dashboard"),
        api.get("/manager/analytics"),
      ]);

      setDashboard(dashboardRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load manager dashboard.",
      );
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);

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
        err.response?.data?.message || "Could not load department queue.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [filters]);

  useEffect(() => {
    if (!socket) return;

    const reload = () => {
      loadDashboard();
      loadQueue();
    };

    socket.on("ticket:updated", reload);
    socket.on("message:created", reload);

    return () => {
      socket.off("ticket:updated", reload);
      socket.off("message:created", reload);
    };
  }, [socket, filters]);

  const handleQueuePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (event.target.closest("a, button, select, input, textarea")) return;

    const container = queueScrollRef.current;
    if (!container) return;

    isDraggingQueue.current = true;
    suppressClick.current = false;
    dragStartX.current = event.clientX;
    dragStartScrollLeft.current = container.scrollLeft;
    container.setPointerCapture?.(event.pointerId);
    container.style.cursor = "grabbing";
  };

  const handleQueuePointerMove = (event) => {
    if (!isDraggingQueue.current) return;

    const container = queueScrollRef.current;
    if (!container) return;

    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) > 4) {
      suppressClick.current = true;
    }

    container.scrollLeft = dragStartScrollLeft.current - distance;
  };

  const handleQueuePointerUp = (event) => {
    const container = queueScrollRef.current;
    isDraggingQueue.current = false;
    container?.releasePointerCapture?.(event.pointerId);
    if (container) container.style.cursor = "grab";
  };

  const handleQueueClickCapture = (event) => {
    if (!suppressClick.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

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

  const metrics = dashboard?.metrics || {};

  const totalTickets = safeNumber(metrics.totalTickets);
  const openTickets = safeNumber(metrics.openTickets);
  const inProgressTickets = safeNumber(metrics.inProgressTickets);
  const waitingTickets = safeNumber(metrics.waitingTickets);
  const highUrgentTickets = safeNumber(metrics.highUrgentTickets);

  const teamWorkload =
    dashboard?.teamWorkload || dashboard?.team || dashboard?.workload || [];

  const statusBreakdown =
    analytics?.statusBreakdown || analytics?.statuses || [];

  const priorityBreakdown =
    analytics?.priorityBreakdown || analytics?.priorities || [];

  const slaMetrics = analytics?.sla || analytics?.slaMetrics || {};

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assignedTo,
  ].filter(Boolean).length;

  const derivedStatusBreakdown = useMemo(() => {
    if (Array.isArray(statusBreakdown) && statusBreakdown.length) {
      return statusBreakdown;
    }

    return statuses
      .map((status) => ({
        status,
        count: tickets.filter((ticket) => ticket.status === status).length,
      }))
      .filter((item) => item.count > 0);
  }, [statusBreakdown, tickets]);

  const derivedPriorityBreakdown = useMemo(() => {
    if (Array.isArray(priorityBreakdown) && priorityBreakdown.length) {
      return priorityBreakdown;
    }

    return priorities
      .map((priority) => ({
        priority,
        count: tickets.filter((ticket) => ticket.priority === priority).length,
      }))
      .filter((item) => item.count > 0);
  }, [priorityBreakdown, tickets]);

  if (loading && !dashboard && !queue) {
    return <LoadingState label="Loading manager dashboard..." />;
  }

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Manager dashboard
          </h1>
        </div>
      </div>

      <ErrorState message={error} />

      {dashboard && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Total tickets",
                value: totalTickets,
                icon: Ticket,
              },
              {
                label: "Open",
                value: openTickets,
                icon: Activity,
              },
              {
                label: "In progress",
                value: inProgressTickets,
                icon: TrendingUp,
              },
              {
                label: "Waiting",
                value: waitingTickets,
                icon: Clock3,
              },
              {
                label: "High / urgent",
                value: highUrgentTickets,
                icon: AlertTriangle,
              },
            ].map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.label} className="surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
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

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Team workload
                  </h2>
                </div>

                <Users className="h-5 w-5 text-slate-400" />
              </div>

              {teamWorkload.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {teamWorkload.slice(0, 8).map((member, index) => {
                    const name =
                      member.agent?.name ||
                      member.user?.name ||
                      member.name ||
                      `Agent ${index + 1}`;

                    const count = safeNumber(
                      member.count ??
                        member.total ??
                        member.ticketCount ??
                        member.openTickets,
                    );

                    const maxCount = Math.max(
                      ...teamWorkload.map((item) =>
                        safeNumber(
                          item.count ??
                            item.total ??
                            item.ticketCount ??
                            item.openTickets,
                        ),
                      ),
                      1,
                    );

                    return (
                      <div key={member._id || member.agent?._id || name}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <UserCheck className="h-4 w-4" />
                            </div>

                            <span className="truncate text-sm font-semibold text-slate-700">
                              {name}
                            </span>
                          </div>

                          <span className="text-sm font-bold text-slate-900">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all"
                            style={{
                              width: `${Math.max(
                                6,
                                Math.round((count / maxCount) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <Users className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No workload data available
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="surface p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      SLA health
                    </h2>
                  </div>

                  <Clock3 className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    [
                      "Within SLA",
                      slaMetrics.withinSla ??
                        slaMetrics.met ??
                        slaMetrics.onTime,
                    ],
                    ["Breached", slaMetrics.breached ?? slaMetrics.overdue],
                    ["At risk", slaMetrics.atRisk],
                    [
                      "First response",
                      slaMetrics.firstResponseAverage ??
                        slaMetrics.averageFirstResponse,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {value ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Status distribution
                  </h2>
                </div>

                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-6 space-y-4">
                {derivedStatusBreakdown.length > 0 ? (
                  derivedStatusBreakdown.map((item) => {
                    const status = item.status || item.name || item._id;

                    const count = safeNumber(item.count ?? item.total);

                    return (
                      <div key={status}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className={`badge ${statusBadgeClass(status)}`}>
                            {titleStatus(status)}
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-500"
                            style={{
                              width: `${percent(count, totalTickets)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    No status breakdown available.
                  </p>
                )}
              </div>
            </div>

            <div className="surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Priority distribution
                  </h2>
                </div>

                <AlertTriangle className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-6 space-y-4">
                {derivedPriorityBreakdown.length > 0 ? (
                  derivedPriorityBreakdown.map((item) => {
                    const priority = item.priority || item.name || item._id;

                    const count = safeNumber(item.count ?? item.total);

                    return (
                      <div key={priority}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span
                            className={`badge ${priorityBadgeClass(priority)}`}
                          >
                            {titleStatus(priority)}
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-700"
                            style={{
                              width: `${percent(count, totalTickets)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    No priority breakdown available.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Department queue
              </h2>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="search-shell min-w-0 xl:min-w-[280px]">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />

                <input
                  className="search-input"
                  value={filters.search}
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                  placeholder="Search tickets..."
                />
              </div>

              <select
                className="field min-w-[145px]"
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
                className="field min-w-[135px]"
                value={filters.priority}
                onChange={(event) =>
                  updateFilter("priority", event.target.value)
                }
              >
                <option value="">All priorities</option>

                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {titleStatus(priority)}
                  </option>
                ))}
              </select>

              <select
                className="field min-w-[155px]"
                value={filters.assignedTo}
                onChange={(event) =>
                  updateFilter("assignedTo", event.target.value)
                }
              >
                <option value="">All assignments</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">My tickets</option>
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && !queue ? (
          <div className="p-8">
            <LoadingState label="Loading department queue..." />
          </div>
        ) : tickets.length > 0 ? (
          <>
            <div
              ref={queueScrollRef}
              className="hidden overflow-x-auto md:block cursor-grab select-none"
              onPointerDown={handleQueuePointerDown}
              onPointerMove={handleQueuePointerMove}
              onPointerUp={handleQueuePointerUp}
              onPointerCancel={handleQueuePointerUp}
              onClickCapture={handleQueueClickCapture}
              onDragStart={(event) => event.preventDefault()}
            >
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Ticket
                    </th>

                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Priority
                    </th>

                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Assigned
                    </th>

                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Updated
                    </th>

                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      className="group transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <Link
                          to={`/tickets/${ticket._id}`}
                          className="block max-w-[320px]"
                        >
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {ticket.ticketNumber || ticket._id}
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-900 group-hover:text-teal-700">
                            {ticket.subject}
                          </p>
                        </Link>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-700">
                          {ticket.customer?.name || "Unknown customer"}
                        </p>

                        {ticket.customer?.email && (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                            {ticket.customer.email}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`badge ${statusBadgeClass(ticket.status)}`}
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
                        <span className="text-sm text-slate-600">
                          {ticket.assignedTo?.name || "Unassigned"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                        {formatDate(ticket.updatedAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          to={`/tickets/${ticket._id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
              {tickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  to={`/tickets/${ticket._id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {ticket.ticketNumber || ticket._id}
                      </p>

                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        {ticket.subject}
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
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

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{ticket.assignedTo?.name || "Unassigned"}</span>

                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-slate-500">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </p>

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
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              No tickets match these filters
            </h3>

            <button
              type="button"
              className="btn-secondary mt-5"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
