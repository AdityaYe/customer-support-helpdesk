import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  Edit3,
  FileText,
  Layers3,
  Plus,
  Save,
  Search,
  Ticket,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import api from "../services/api.js";
import { formatDate, titleStatus } from "../utils/format.js";
import {
  priorities,
  priorityBadgeClass,
  statusBadgeClass,
  statuses,
} from "../utils/ticketOptions.js";

const tabs = [
  ["dashboard", "Dashboard", BarChart3],
  ["tickets", "Tickets", Ticket],
  ["users", "Users", UserCog],
  ["departments", "Departments", Layers3],
  ["categories", "Categories", ClipboardList],
  ["request-types", "Request Types", FileText],
  ["knowledge-base", "Knowledge Base", BookOpen],
  ["saved-replies", "Saved Replies", Database],
];

const blankForms = {
  users: {
    name: "",
    email: "",
    password: "",
    role: "agent",
    department: "",
    active: true,
  },

  departments: {
    name: "",
    description: "",
    active: true,
  },

  categories: {
    name: "",
    description: "",
    department: "",
    active: true,
  },

  "request-types": {
    name: "",
    description: "",
    category: "",
    department: "",
    faqTitle: "",
    faqContent: "",
    active: true,
    formFields: [],
  },

  "saved-replies": {
    title: "",
    content: "",
    active: true,
  },
};

const fieldTypes = ["text", "number", "select", "textarea", "date"];

const formatLabel = (value) =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const formatMetricLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const safeNumber = (value) => {
  if (typeof value === "number") return value;
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getItemName = (item) =>
  item?.name || item?.title || item?.email || "Untitled";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [data, setData] = useState({
    users: [],
    departments: [],
    categories: [],
    "request-types": [],
    "saved-replies": [],
  });

  const [forms, setForms] = useState(blankForms);
  const [editing, setEditing] = useState({});

  const [filters, setFilters] = useState({
    search: "",
    role: "",
    department: "",
    category: "",
    active: "",
  });

  const [ticketFilters, setTicketFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignedTo: "",
    page: 1,
  });

  const [tickets, setTickets] = useState(null);
  const [ticketAgents, setTicketAgents] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketAssigning, setTicketAssigning] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navRef = useRef(null);
  const navDragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const [isDraggingNav, setIsDraggingNav] = useState(false);

  const departments = data.departments;
  const categories = data.categories;

  const loadResource = async (resource) => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (
      filters.department &&
      ["users", "categories", "request-types", "knowledge-base"].includes(
        resource,
      )
    ) {
      params.set("department", filters.department);
    }

    if (
      filters.category &&
      ["request-types", "knowledge-base"].includes(resource)
    ) {
      params.set("category", filters.category);
    }

    if (filters.active && resource !== "users") {
      params.set("active", filters.active);
    }

    if (filters.role && resource === "users") {
      params.set("role", filters.role);
    }

    const endpoint = resource === "knowledge-base" ? "request-types" : resource;

    const response =
      endpoint === "saved-replies"
        ? await api.get(`/saved-replies?${params.toString()}`)
        : await api.get(`/admin/${endpoint}?${params.toString()}`);

    setData((current) => ({
      ...current,
      [endpoint]: response.data.data || [],
    }));
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        summaryRes,
        analyticsRes,
        usersRes,
        departmentsRes,
        categoriesRes,
        requestTypesRes,
        savedRepliesRes,
      ] = await Promise.all([
        api.get("/admin/summary"),
        api.get("/admin/analytics"),
        api.get("/admin/users"),
        api.get("/admin/departments"),
        api.get("/admin/categories"),
        api.get("/admin/request-types"),
        api.get("/saved-replies"),
      ]);

      setSummary(summaryRes.data.data);
      setAnalytics(analyticsRes.data.data);

      setData({
        users: usersRes.data.data || [],
        departments: departmentsRes.data.data || [],
        categories: categoriesRes.data.data || [],
        "request-types": requestTypesRes.data.data || [],
        "saved-replies": savedRepliesRes.data.data || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    setTicketLoading(true);

    try {
      const params = new URLSearchParams();

      Object.entries(ticketFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await api.get(`/agent/tickets?${params.toString()}`);
      setTickets(response.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load tickets.");
    } finally {
      setTicketLoading(false);
    }
  };

  const loadTicketAgents = async () => {
    try {
      const response = await api.get("/agent/agents");
      setTicketAgents(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load agents.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (loading || activeTab === "dashboard" || activeTab === "tickets") {
      return;
    }

    loadResource(activeTab).catch((err) => {
      setError(err.response?.data?.message || `Could not load ${activeTab}.`);
    });
  }, [filters, activeTab]);

  useEffect(() => {
    if (loading || activeTab !== "tickets") {
      return;
    }

    loadTickets();
  }, [ticketFilters, activeTab, loading]);

  useEffect(() => {
    if (!loading && activeTab === "tickets" && ticketAgents.length === 0) {
      loadTicketAgents();
    }
  }, [activeTab, loading, ticketAgents.length]);

  const currentResource =
    activeTab === "knowledge-base" ? "request-types" : activeTab;

  const currentForm = forms[currentResource];
  const currentItems = data[currentResource] || [];

  const updateForm = (resource, patch) => {
    setForms((current) => ({
      ...current,
      [resource]: {
        ...current[resource],
        ...patch,
      },
    }));
  };

  const startEdit = (resource, item) => {
    setEditing({
      resource,
      id: item._id,
    });

    const payload = {
      ...blankForms[resource],
      ...item,
    };

    if (item.department?._id) {
      payload.department = item.department._id;
    }

    if (item.category?._id) {
      payload.category = item.category._id;
    }

    if (resource === "users") {
      payload.password = "";
    }

    if (resource === "request-types" && Array.isArray(item.formFields)) {
      payload.formFields = item.formFields;
    }

    setForms((current) => ({
      ...current,
      [resource]: payload,
    }));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const resetForm = (resource) => {
    setEditing({});
    setForms((current) => ({
      ...current,
      [resource]: {
        ...blankForms[resource],
        formFields: resource === "request-types" ? [] : undefined,
      },
    }));
  };

  const saveResource = async (resource) => {
    setSaving(resource);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...forms[resource],
      };

      if (resource === "request-types" && !Array.isArray(payload.formFields)) {
        payload.formFields = [];
      }

      if (resource === "users" && !payload.password) {
        delete payload.password;
      }

      if (payload.department === "") {
        payload.department = null;
      }

      if (payload.category === "") {
        delete payload.category;
      }

      if (resource === "saved-replies") {
        if (editing.id && editing.resource === resource) {
          await api.patch(`/saved-replies/${editing.id}`, payload);
        } else {
          await api.post("/saved-replies", payload);
        }
      } else if (editing.id && editing.resource === resource) {
        await api.patch(`/admin/${resource}/${editing.id}`, payload);
      } else {
        await api.post(`/admin/${resource}`, payload);
      }

      setSuccess(`${formatLabel(resource)} saved successfully.`);

      resetForm(resource);

      await loadResource(resource);

      const [summaryRes, analyticsRes] = await Promise.all([
        api.get("/admin/summary"),
        api.get("/admin/analytics"),
      ]);

      setSummary(summaryRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this item.");
    } finally {
      setSaving("");
    }
  };

  const removeResource = async (resource, id) => {
    if (!window.confirm("Delete this item? This cannot be undone.")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      if (resource === "saved-replies") {
        await api.delete(`/saved-replies/${id}`);
      } else {
        await api.delete(`/admin/${resource}/${id}`);
      }

      setSuccess("Deleted successfully.");

      await loadResource(resource);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this item.");
    }
  };

  const assignTicket = async (ticketId, assignedTo) => {
    const key = `${ticketId}:${assignedTo}`;
    setTicketAssigning(key);
    setError("");
    setSuccess("");

    try {
      await api.post(`/tickets/${ticketId}/assign`, {
        assignedTo,
      });

      setSuccess("Ticket assignment updated successfully.");
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update ticket assignment.");
    } finally {
      setTicketAssigning("");
    }
  };

  const updateTicketFilter = (name, value) => {
    setTicketFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "page" ? {} : { page: 1 }),
    }));
  };

  const clearTicketFilters = () => {
    setTicketFilters({
      search: "",
      status: "",
      priority: "",
      assignedTo: "",
      page: 1,
    });
  };

  const handleNavMouseDown = (event) => {
    if (event.button !== 0) return;

    const element = navRef.current;
    if (!element) return;

    navDragRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft,
      moved: false,
    };

    setIsDraggingNav(true);
  };

  const handleNavMouseMove = (event) => {
    if (!navDragRef.current.active) return;

    const element = navRef.current;
    if (!element) return;

    const distance = event.clientX - navDragRef.current.startX;

    if (Math.abs(distance) > 4) {
      navDragRef.current.moved = true;
    }

    element.scrollLeft = navDragRef.current.startScrollLeft - distance;
  };

  const handleNavMouseUp = () => {
    navDragRef.current.active = false;
    setIsDraggingNav(false);
  };

  const handleNavClickCapture = (event) => {
    if (!navDragRef.current.moved) return;

    event.preventDefault();
    event.stopPropagation();
    navDragRef.current.moved = false;
  };

  const filteredCategories = useMemo(() => {
    if (!currentForm?.department) {
      return categories;
    }

    return categories.filter(
      (category) =>
        (category.department?._id || category.department) ===
        currentForm.department,
    );
  }, [categories, currentForm?.department]);

  const dashboardCards = useMemo(() => {
    if (!summary) return [];

    return Object.entries(summary).map(([key, value]) => ({
      key,
      label: formatLabel(key),
      value,
    }));
  }, [summary]);

  if (loading) {
    return <LoadingState label="Loading admin dashboard..." />;
  }

  return (
    <>
      <style>{`
        .admin-tabs-scroll::-webkit-scrollbar,
        .admin-ticket-scroll::-webkit-scrollbar {
          height: 0;
        }
        .admin-tabs-scroll,
        .admin-ticket-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      <div className="page-container max-w-7xl">
      <header className="mb-7">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Admin dashboard
          </h1>
        </div>
      </header>

      <div
        ref={navRef}
        className={`admin-tabs-scroll mb-6 overflow-x-auto overscroll-x-contain ${
          isDraggingNav ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        onMouseDown={handleNavMouseDown}
        onMouseMove={handleNavMouseMove}
        onMouseUp={handleNavMouseUp}
        onMouseLeave={handleNavMouseUp}
        onClickCapture={handleNavClickCapture}
      >
        <nav className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:min-w-0 lg:flex-nowrap lg:justify-between">
          {tabs.map(([id, label, Icon]) => {
            const active = activeTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setError("");
                  setSuccess("");
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition lg:px-2.5 lg:text-[13px] ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-5">
        <ErrorState message={error} />

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {activeTab === "dashboard" && summary && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dashboardCards.map((card, index) => {
                const icons = [Database, Users, Ticket, TrendingUp];
                const Icon = icons[index % icons.length];

                return (
                  <div key={card.key} className="surface p-5">
                    <div className="flex items-start justify-between gap-4">
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

            {analytics && (
              <section className="grid gap-5 lg:grid-cols-3">
                <MetricList
                  title="Tickets by department"
                  values={analytics.ticketsByDepartment}
                  icon={Layers3}
                />

                <MetricList
                  title="Tickets by status"
                  values={analytics.ticketsByStatus}
                  icon={TrendingUp}
                />

                <MetricList
                  title="Tickets by priority"
                  values={analytics.ticketsByPriority}
                  icon={TrendingUp}
                />

                <div className="surface p-6 lg:col-span-3">
                  <div className="flex items-start justify-between gap-5">
                    <h2 className="text-lg font-bold text-slate-950">
                      SLA and satisfaction
                    </h2>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <InsightCard
                      label="SLA at risk"
                      value={analytics.slaAtRisk}
                      tone="amber"
                    />

                    <InsightCard
                      label="SLA breached"
                      value={analytics.slaBreached}
                      tone="rose"
                    />

                    <InsightCard
                      label="Average satisfaction"
                      value={analytics.averageSatisfaction ?? "-"}
                      tone="emerald"
                    />
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "tickets" && (
          <AdminTicketQueue
            tickets={tickets}
            agents={ticketAgents}
            filters={ticketFilters}
            loading={ticketLoading}
            assigning={ticketAssigning}
            onFilter={updateTicketFilter}
            onClearFilters={clearTicketFilters}
            onAssign={assignTicket}
          />
        )}

        {activeTab !== "dashboard" && activeTab !== "tickets" && (
          <>
            {currentForm && (
              <section className="surface overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        {editing.id && editing.resource === currentResource
                          ? "Edit record"
                          : "Create record"}
                      </p>

                      <h2 className="mt-1 text-xl font-bold capitalize text-slate-950">
                        {formatLabel(currentResource)}
                      </h2>
                    </div>

                    {editing.id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => resetForm(currentResource)}
                      >
                        <X className="h-4 w-4" />
                        Cancel editing
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <AdminForm
                    resource={currentResource}
                    form={currentForm}
                    update={(patch) => updateForm(currentResource, patch)}
                    departments={departments}
                    categories={filteredCategories}
                  />

                  <div className="mt-6 flex gap-3 border-t border-slate-200 pt-5">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={saving === currentResource}
                      onClick={() => saveResource(currentResource)}
                    >
                      <Save className="h-4 w-4" />
                      {saving === currentResource
                        ? "Saving..."
                        : editing.id
                          ? "Save changes"
                          : "Create record"}
                    </button>

                    {!editing.id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => resetForm(currentResource)}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            <ResourceList
              resource={currentResource}
              activeTab={activeTab}
              items={currentItems}
              filters={filters}
              departments={departments}
              categories={categories}
              onFilters={setFilters}
              onEdit={startEdit}
              onDelete={removeResource}
            />
          </>
        )}
      </div>
      </div>
    </>
  );
}

function AdminTicketQueue({
  tickets,
  agents,
  filters,
  loading,
  assigning,
  onFilter,
  onClearFilters,
  onAssign,
}) {
  const tableScrollRef = useRef(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;

    const interactive = event.target.closest(
      "a,button,input,select,textarea,label",
    );

    if (interactive) return;

    const element = tableScrollRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;

    event.preventDefault();

    dragState.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
    };

    element.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!dragState.current.active) return;

    const element = tableScrollRef.current;
    if (!element) return;

    const delta = event.clientX - dragState.current.startX;
    element.scrollLeft = dragState.current.scrollLeft - delta;
  };

  const endPointerDrag = (event) => {
    const element = tableScrollRef.current;

    dragState.current.active = false;
    setIsDragging(false);

    if (event?.pointerId != null) {
      element?.releasePointerCapture?.(event.pointerId);
    }
  };

  const ticketRows = tickets?.tickets || tickets?.data || [];
  const pagination = tickets?.pagination || {
    page: 1,
    totalPages: 1,
    total: ticketRows.length,
  };

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assignedTo,
  ].filter(Boolean).length;

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Tickets</h2>
            <p className="mt-1 text-sm text-slate-500">
              Global ticket queue across all departments.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-400">
            {pagination.total ?? ticketRows.length} tickets
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 lg:grid-cols-[2fr_1fr_1fr_1.2fr_auto]">
        <label className="search-shell">
          <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="search-input"
            value={filters.search}
            onChange={(event) => onFilter("search", event.target.value)}
            placeholder="Search tickets..."
          />
        </label>

        <SelectFilter
          value={filters.status}
          onChange={(value) => onFilter("status", value)}
          options={[
            ["", "All statuses"],
            ...statuses.map((status) => [status, titleStatus(status)]),
          ]}
        />

        <SelectFilter
          value={filters.priority}
          onChange={(value) => onFilter("priority", value)}
          options={[
            ["", "All priorities"],
            ...priorities.map((priority) => [
              priority,
              titleStatus(priority),
            ]),
          ]}
        />

        <SelectFilter
          value={filters.assignedTo}
          onChange={(value) => onFilter("assignedTo", value)}
          options={[
            ["", "All assignments"],
            ["unassigned", "Unassigned"],
            ...agents.map((agent) => [agent._id, agent.name]),
          ]}
        />

        {activeFilterCount > 0 && (
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && !tickets ? (
        <div className="p-8">
          <LoadingState label="Loading tickets..." />
        </div>
      ) : ticketRows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Ticket className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No tickets found
          </h3>
        </div>
      ) : (
        <>
          <div
            ref={tableScrollRef}
            className={`admin-ticket-scroll hidden overflow-x-auto md:block ${
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointerDrag}
            onPointerCancel={endPointerDrag}
            style={{ touchAction: "pan-x" }}
          >
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ticket
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
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
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {ticketRows.map((ticket) => {
                  const currentAssignee = ticket.assignedTo?._id || "";
                  const assignmentKey = `${ticket._id}:${currentAssignee}`;

                  return (
                    <tr key={ticket._id} className="group hover:bg-slate-50/70">
                      <td className="px-6 py-5">
                        <Link to={`/tickets/${ticket._id}`} className="block max-w-[300px]">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {ticket.ticketNumber || ticket._id}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                            {ticket.subject}
                          </p>
                        </Link>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-slate-700">
                          {ticket.customer?.name || "Unknown customer"}
                        </p>
                        {ticket.customer?.email && (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                            {ticket.customer.email}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span className="badge bg-teal-50 text-teal-700">
                          {ticket.department?.name || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className={`badge ${statusBadgeClass(ticket.status)}`}>
                          {titleStatus(ticket.status)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className={`badge ${priorityBadgeClass(ticket.priority)}`}>
                          {titleStatus(ticket.priority)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex min-w-[190px] items-center gap-2">
                          <UserCheck className="h-4 w-4 shrink-0 text-slate-400" />
                          <select
                            className="field min-w-0 flex-1 pr-8"
                            value={currentAssignee}
                            disabled={Boolean(assigning && assigning.startsWith(`${ticket._id}:`))}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value) {
                                onAssign(ticket._id, value);
                              }
                            }}
                          >
                            <option value="">Unassigned</option>
                            {agents.map((agent) => (
                              <option key={agent._id} value={agent._id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                          {assigning === assignmentKey && (
                            <span className="text-xs text-slate-400">Saving</span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                        {formatDate(ticket.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {ticketRows.map((ticket) => (
              <div key={ticket._id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/tickets/${ticket._id}`} className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {ticket.ticketNumber || ticket._id}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">
                      {ticket.subject}
                    </h3>
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`badge ${statusBadgeClass(ticket.status)}`}>
                    {titleStatus(ticket.status)}
                  </span>
                  <span className={`badge ${priorityBadgeClass(ticket.priority)}`}>
                    {titleStatus(ticket.priority)}
                  </span>
                  {ticket.department?.name && (
                    <span className="badge bg-teal-50 text-teal-700">
                      {ticket.department.name}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Assigned agent
                  </p>
                  <select
                    className="field w-full"
                    value={ticket.assignedTo?._id || ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value) {
                        onAssign(ticket._id, value);
                      }
                    }}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{ticket.customer?.name || "Unknown customer"}</span>
                  <span>{formatDate(ticket.updatedAt)}</span>
                </div>
              </div>
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
                  onFilter("page", Math.max(1, (pagination.page || 1) - 1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                className="btn-secondary h-9 px-3"
                disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                onClick={() =>
                  onFilter("page", (pagination.page || 1) + 1)
                }
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function InsightCard({ label, value, tone }) {
  const styles = {
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };

  return (
    <div className={`rounded-2xl p-5 ring-1 ${styles[tone] || styles.emerald}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value ?? "-"}</p>
    </div>
  );
}

function MetricList({ title, values, icon: Icon }) {
  const entries = Object.entries(values || {});
  const total = entries.reduce(
    (sum, [, itemValue]) => sum + safeNumber(itemValue),
    0,
  );

  return (
    <div className="surface p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          entries.map(([label, value]) => {
            const numericValue = safeNumber(value);
            const width = total
              ? Math.max(5, Math.round((numericValue / total) * 100))
              : 0;

            return (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-600">
                    {formatMetricLabel(label)}
                  </span>
                  <strong className="text-sm text-slate-900">{value}</strong>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        className="field appearance-none pr-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue || "all"} value={optionValue}>
            {label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function AdminForm({ resource, form, update, departments, categories }) {
  if (resource === "users") {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" value={form.name} placeholder="Full name" onChange={(value) => update({ name: value })} />
        <Field label="Email" value={form.email} placeholder="Email address" type="email" onChange={(value) => update({ email: value })} />
        <Field label="Password" value={form.password || ""} placeholder="Password" type="password" onChange={(value) => update({ password: value })} />
        <SelectField
          label="Role"
          value={form.role}
          options={[
            ["customer", "Customer"],
            ["agent", "Agent"],
            ["manager", "Manager"],
            ["admin", "Admin"],
          ]}
          onChange={(value) => update({ role: value })}
        />
        <SelectField
          label="Department"
          value={form.department || ""}
          options={[
            ["", "No department"],
            ...departments.map((department) => [department._id, department.name]),
          ]}
          onChange={(value) => update({ department: value })}
        />
        <ToggleField label="Account active" checked={Boolean(form.active)} onChange={(value) => update({ active: value })} />
      </div>
    );
  }

  if (resource === "departments") {
    return (
      <div className="grid gap-5">
        <Field label="Name" value={form.name} placeholder="Department name" onChange={(value) => update({ name: value })} />
        <TextareaField label="Description" value={form.description} placeholder="Describe what this department handles..." onChange={(value) => update({ description: value })} />
        <ToggleField label="Department active" checked={Boolean(form.active)} onChange={(value) => update({ active: value })} />
      </div>
    );
  }

  if (resource === "categories") {
    return (
      <div className="grid gap-5">
        <Field label="Category name" value={form.name} placeholder="Category name" onChange={(value) => update({ name: value })} />
        <SelectField
          label="Department"
          value={form.department || ""}
          options={[
            ["", "Select department"],
            ...departments.map((department) => [department._id, department.name]),
          ]}
          onChange={(value) => update({ department: value })}
        />
        <TextareaField label="Description" value={form.description} placeholder="Describe this category..." onChange={(value) => update({ description: value })} />
        <ToggleField label="Category active" checked={Boolean(form.active)} onChange={(value) => update({ active: value })} />
      </div>
    );
  }

  if (resource === "saved-replies") {
    return (
      <div className="grid gap-5">
        <Field label="Title" value={form.title} placeholder="Example: Password reset response" onChange={(value) => update({ title: value })} />
        <TextareaField label="Reply content" value={form.content} placeholder="Write the reusable support response..." minHeight="min-h-36" onChange={(value) => update({ content: value })} />
        <ToggleField label="Reply active" checked={Boolean(form.active)} onChange={(value) => update({ active: value })} />
      </div>
    );
  }

  return (
    <RequestTypeForm
      form={form}
      update={update}
      departments={departments}
      categories={categories}
    />
  );
}

function RequestTypeForm({ form, update, departments, categories }) {
  const updateField = (index, patch) => {
    update({
      formFields: (form.formFields || []).map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    });
  };

  const addField = () => {
    update({
      formFields: [
        ...(form.formFields || []),
        {
          name: "",
          label: "",
          type: "text",
          required: false,
          options: [],
        },
      ],
    });
  };

  const removeField = (index) => {
    update({
      formFields: (form.formFields || []).filter(
        (_, fieldIndex) => fieldIndex !== index,
      ),
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Request type name" value={form.name} placeholder="Example: Payment issue" onChange={(value) => update({ name: value })} />
        <SelectField
          label="Department"
          value={form.department || ""}
          options={[
            ["", "Select department"],
            ...departments.map((department) => [department._id, department.name]),
          ]}
          onChange={(value) => update({ department: value, category: "" })}
        />
      </div>

      <TextareaField label="Description" value={form.description} placeholder="Describe what customers can use this request type for..." onChange={(value) => update({ description: value })} />

      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          label="Category"
          value={form.category || ""}
          options={[
            ["", "Select category"],
            ...categories.map((category) => [category._id, category.name]),
          ]}
          onChange={(value) => update({ category: value })}
        />
        <Field label="FAQ title" value={form.faqTitle} placeholder="FAQ article title" onChange={(value) => update({ faqTitle: value })} />
      </div>

      <TextareaField label="FAQ content" value={form.faqContent} placeholder="Write the knowledge base / FAQ content..." minHeight="min-h-44" onChange={(value) => update({ faqContent: value })} />

      <ToggleField label="Published" checked={Boolean(form.active)} onChange={(value) => update({ active: value })} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Dynamic form
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              Customer fields
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add information customers should provide when submitting this request type.
            </p>
          </div>

          <button type="button" className="btn-secondary" onClick={addField}>
            <Plus className="h-4 w-4" />
            Add field
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {(form.formFields || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <FileText className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                No dynamic fields
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The customer form will only use the standard fields.
              </p>
            </div>
          ) : (
            (form.formFields || []).map((field, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_150px_auto]">
                  <Field label="Field name" compact value={field.name} placeholder="internal_name" onChange={(value) => updateField(index, { name: value })} />
                  <Field label="Label" compact value={field.label} placeholder="Customer-facing label" onChange={(value) => updateField(index, { label: value })} />
                  <SelectField label="Type" compact value={field.type} options={fieldTypes.map((type) => [type, formatLabel(type)])} onChange={(value) => updateField(index, { type: value })} />
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary h-10 w-full px-3 text-rose-700 hover:text-rose-800 md:w-10" onClick={() => removeField(index)} title="Remove field">
                      <Trash2 className="h-4 w-4" />
                      <span className="md:hidden">Remove</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <ToggleField label="Required field" checked={Boolean(field.required)} onChange={(value) => updateField(index, { required: value })} compact />
                  <span className="text-xs text-slate-400">Field #{index + 1}</span>
                </div>

                {field.type === "select" && (
                  <Field label="Options" compact value={(field.options || []).join(", ")} placeholder="Option one, Option two, Option three" className="mt-3" onChange={(value) => updateField(index, { options: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  compact = false,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-2 block font-semibold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
      <input
        className="field"
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = "min-h-28",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <textarea
        className={`field resize-y ${minHeight}`}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, compact = false }) {
  return (
    <label className="block">
      <span className={`mb-2 block font-semibold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
      <select className="field" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "empty"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ label, checked, onChange, compact = false }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-3 ${compact ? "text-xs" : "text-sm"} font-semibold text-slate-700`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 accent-teal-600"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function ResourceList({
  resource,
  activeTab,
  items,
  filters,
  departments,
  categories,
  onFilters,
  onEdit,
  onDelete,
}) {
  const updateFilter = (name, value) => {
    onFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const filterResource = activeTab === "knowledge-base" ? "knowledge-base" : resource;

  const searchLabel =
    activeTab === "knowledge-base"
      ? "Search knowledge base..."
      : `Search ${formatLabel(resource).toLowerCase()}...`;

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {activeTab === "knowledge-base" ? "Knowledge base" : formatLabel(resource)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Existing records and configuration.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {items.length}
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 lg:grid-cols-4">
        <label className="search-shell lg:col-span-2">
          <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="search-input"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder={searchLabel}
          />
        </label>

        {filterResource === "users" && (
          <SelectFilter
            value={filters.role}
            onChange={(value) => updateFilter("role", value)}
            options={[
              ["", "All roles"],
              ["customer", "Customer"],
              ["agent", "Agent"],
              ["manager", "Manager"],
              ["admin", "Admin"],
            ]}
          />
        )}

        {["users", "categories", "request-types", "knowledge-base"].includes(
          filterResource,
        ) && (
          <SelectFilter
            value={filters.department}
            onChange={(value) => updateFilter("department", value)}
            options={[
              ["", "All departments"],
              ...departments.map((department) => [department._id, department.name]),
            ]}
          />
        )}

        {["request-types", "knowledge-base"].includes(filterResource) && (
          <SelectFilter
            value={filters.category}
            onChange={(value) => updateFilter("category", value)}
            options={[
              ["", "All categories"],
              ...categories.map((category) => [category._id, category.name]),
            ]}
          />
        )}

        {filterResource !== "users" && (
          <SelectFilter
            value={filters.active}
            onChange={(value) => updateFilter("active", value)}
            options={[
              ["", "Any state"],
              ["true", "Active / published"],
              ["false", "Inactive / unpublished"],
            ]}
          />
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Database className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            No records found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create a new record or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item._id} className="group flex flex-col gap-5 p-5 transition hover:bg-slate-50/60 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{getItemName(item)}</p>

                  {item.role && (
                    <span className="badge bg-slate-100 text-slate-600">
                      {formatMetricLabel(item.role)}
                    </span>
                  )}

                  {item.active !== undefined && (
                    <span className={`badge ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {item.description || item.faqTitle || item.content || item.email || "No description available."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.email && item.name && (
                    <span className="badge bg-slate-50 text-slate-500">{item.email}</span>
                  )}

                  {item.department?.name && (
                    <span className="badge bg-teal-50 text-teal-700">{item.department.name}</span>
                  )}

                  {item.category?.name && (
                    <span className="badge bg-indigo-50 text-indigo-700">{item.category.name}</span>
                  )}

                  {Array.isArray(item.formFields) && (
                    <span className="badge bg-slate-100 text-slate-600">
                      {item.formFields.length} custom field{item.formFields.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button type="button" className="btn-secondary" onClick={() => onEdit(resource, item)}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>

                <button type="button" className="btn-secondary px-3 text-rose-700 hover:border-rose-200 hover:bg-rose-50" onClick={() => onDelete(resource, item._id)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
