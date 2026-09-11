import { Paperclip, Send, Star, Tag, UserCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api.js";
import { formatDate, titleStatus } from "../utils/format.js";
import {
  priorities,
  priorityBadgeClass,
  statusBadgeClass,
} from "../utils/ticketOptions.js";

const supportRoles = ["agent", "manager", "admin"];

const activityText = (activity) => {
  const actor = activity.actor?.name || "Someone";

  const typeMap = {
    TICKET_CREATED: `${actor} created this ticket.`,
    ASSIGNED: `${actor} assigned this ticket to ${activity.metadata?.assigneeName || "an agent"}.`,
    REASSIGNED: `${actor} reassigned this ticket to ${activity.metadata?.assigneeName || "an agent"}.`,
    STATUS_CHANGED: `${actor} changed status from ${activity.fromValue} to ${activity.toValue}.`,
    PRIORITY_CHANGED: `${actor} changed priority from ${activity.fromValue} to ${activity.toValue}.`,
    MESSAGE_ADDED: `${actor} added a reply.`,
    INTERNAL_NOTE_ADDED: `${actor} added an internal note.`,
    TAGS_CHANGED: `${actor} updated tags.`,
    RESOLVED: `${actor} resolved this ticket.`,
    CLOSED: `${actor} closed this ticket.`,
    REOPENED: `${actor} reopened this ticket.`,
  };

  return typeMap[activity.type] || `${actor} updated this ticket.`;
};

export default function TicketDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();

  const isSupport = supportRoles.includes(user?.role);
  const isAgent = user?.role === "agent";
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [agents, setAgents] = useState([]);
  const [savedReplies, setSavedReplies] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [satisfaction, setSatisfaction] = useState(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: "",
  });
  const [reply, setReply] = useState("");
  const [messageMode, setMessageMode] = useState("reply");
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const activityRef = useRef(null);

  const loadTicket = async () => {
    const [ticketRes, activityRes, attachmentRes, satisfactionRes] =
      await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/activity`),
        api.get(`/tickets/${id}/attachments`),
        api
          .get(`/tickets/${id}/satisfaction`)
          .catch(() => ({ data: { data: null } })),
      ]);

    setTicket(ticketRes.data.data.ticket);
    setMessages(ticketRes.data.data.messages);
    setActivity(activityRes.data.data);
    setAttachments(attachmentRes.data.data);
    setSatisfaction(satisfactionRes.data.data);
  };

  useEffect(() => {
    setLoading(true);

    Promise.all([
      loadTicket(),
      isSupport
        ? api.get("/agent/agents")
        : Promise.resolve({ data: { data: [] } }),
      isSupport
        ? api.get("/saved-replies")
        : Promise.resolve({ data: { data: [] } }),
    ])
      .then(([, agentsRes, savedReplyRes]) => {
        setAgents(agentsRes.data.data);
        setSavedReplies(savedReplyRes.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load the ticket.");
      })
      .finally(() => setLoading(false));
  }, [id, isSupport]);

  useEffect(() => {
    if (!socket) return;

    const reload = (payload) => {
      if (payload?.ticketId === id) {
        loadTicket().catch(() => {});
      }
    };

    socket.on("message:created", reload);
    socket.on("ticket:updated", reload);

    return () => {
      socket.off("message:created", reload);
      socket.off("ticket:updated", reload);
    };
  }, [socket, id]);

  const sortedActivity = useMemo(
    () =>
      [...activity].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      ),
    [activity],
  );

  useEffect(() => {
    const container = activityRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [sortedActivity]);

  const allowedStatuses = ticket?.allowedStatusTransitions || [];

  const customFieldEntries = useMemo(
    () => Object.entries(ticket?.customFields || {}),
    [ticket],
  );

  const canSubmitFeedback =
    user?.role === "customer" &&
    ["RESOLVED", "CLOSED"].includes(ticket?.status) &&
    !satisfaction;

  const isAssignedToCurrentUser =
    isAgent && ticket?.assignedTo?._id === user?._id;

  const isUnassigned = !ticket?.assignedTo?._id;

  const isAssignedToAnotherAgent =
    isAgent && Boolean(ticket?.assignedTo?._id) && !isAssignedToCurrentUser;

  const priorityDisplay = {
    URGENT: {
      label: "Urgent",
      className: "border-red-300 bg-red-50 text-red-700",
    },
    HIGH: {
      label: "High",
      className: "border-yellow-300 bg-yellow-50 text-yellow-700",
    },
    MEDIUM: {
      label: "Medium",
      className: "border-green-300 bg-green-50 text-green-700",
    },
    LOW: {
      label: "Low",
      className: "border-lime-300 bg-lime-50 text-lime-700",
    },
  };

  const currentPriority =
    priorityDisplay[ticket?.priority] || priorityDisplay.MEDIUM;

  const canReply = ticket?.status !== "CLOSED" || isSupport;

  const canAgentSelfAssign =
    isAgent && isUnassigned && ticket?.status !== "CLOSED";

  const canShowAssignmentSelector = isManager || isAdmin;

  const canAgentWork = !isAgent || isAssignedToCurrentUser || isUnassigned;

  const canUseMessageComposer =
    user?.role === "customer"
      ? canReply
      : isAgent
        ? isAssignedToCurrentUser && canReply
        : canReply;

  const submitReply = async (event) => {
    event.preventDefault();

    if (!reply.trim() || !canUseMessageComposer) {
      return;
    }

    setSaving("message");
    setError("");

    try {
      const res = await api.post(`/tickets/${id}/messages`, {
        message: reply,
        isInternal: isSupport && messageMode === "internal",
      });

      setMessages((current) => [...current, res.data.data]);
      setReply("");

      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send your reply.");
    } finally {
      setSaving("");
    }
  };

  const updateTicketField = async (endpoint, payload) => {
    setSaving(endpoint);
    setError("");

    try {
      const res = await api.patch(`/tickets/${id}/${endpoint}`, payload);

      setTicket(res.data.data);
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update this ticket.");
    } finally {
      setSaving("");
    }
  };

  const assignTicket = async (assignedTo = null) => {
    if (isAgent) {
      if (ticket?.assignedTo?._id) {
        if (ticket.assignedTo._id === user?._id) {
          return;
        }
        setError("This ticket is already assigned to another agent.");
        return;
      }
      assignedTo = user?._id;
    }
    if ((isManager || isAdmin) && !assignedTo) {
      setError("Please select an agent.");
      return;
    }

    setSaving("assign");
    setError("");

    try {
      const res = await api.post(`/tickets/${id}/assign`, {
        assignedTo,
      });

      setTicket(res.data.data);

      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.message || "Could not assign this ticket.");
    } finally {
      setSaving("");
    }
  };

  const addTag = async () => {
    const tag = tagInput.trim().toLowerCase();

    if (!tag || ticket.tags?.includes(tag)) {
      return;
    }

    await updateTicketField("tags", {
      tags: [...(ticket.tags || []), tag],
    });

    setTagInput("");
  };

  const removeTag = async (tag) => {
    await updateTicketField("tags", {
      tags: (ticket.tags || []).filter((item) => item !== tag),
    });
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setSaving("attachments");
    setError("");

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      if (isSupport && messageMode === "internal") {
        formData.append("isInternal", "true");
      }

      await api.post(`/tickets/${id}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFiles([]);
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload attachments.");
    } finally {
      setSaving("");
    }
  };

  const submitSatisfaction = async (event) => {
    event.preventDefault();

    setSaving("satisfaction");
    setError("");

    try {
      const res = await api.post(`/tickets/${id}/satisfaction`, feedback);

      setSatisfaction(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit feedback.");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return <LoadingState label="Loading ticket details..." />;
  }

  if (!ticket) {
    return <ErrorState message={error || "Ticket not found."} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <ErrorState message={error} />

        {location.state?.notice && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {location.state.notice}
          </p>
        )}

        <div className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-h-11 items-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm">
              <span className="mr-1 text-brand-100">Ticket ID:</span>
              <span>{ticket.ticketNumber}</span>
            </div>

            <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {ticket.subject}
            </h1>

            <div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </span>
              <span
                className={`inline-flex min-w-[96px] items-center justify-center rounded-md border px-3 py-1.5 text-sm font-semibold ${statusBadgeClass(ticket.status)}`}
              >
                {titleStatus(ticket.status)}
              </span>
            </div>

            <div
              className={`flex min-h-11 items-center gap-2 rounded-md border px-4 ${currentPriority.className}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Priority
              </span>
              <span className="min-w-[72px] text-center text-sm font-semibold">
                {currentPriority.label}
              </span>
            </div>
          </div>
        </div>

        {isSupport && (
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 shrink-0 text-sm font-bold text-slate-900">
                Manage ticket
              </h2>

              <select
                className="field w-auto min-w-[180px] flex-1 lg:max-w-[220px]"
                value=""
                disabled={
                  allowedStatuses.length === 0 ||
                  saving === "status" ||
                  !canAgentWork
                }
                onChange={(event) =>
                  updateTicketField("status", {
                    status: event.target.value,
                  })
                }
              >
                <option value="">Move from {titleStatus(ticket.status)}</option>
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {titleStatus(status)}
                  </option>
                ))}
              </select>

              <select
                className="field w-auto min-w-[140px] flex-1 lg:max-w-[180px]"
                value={ticket.priority}
                disabled={saving === "priority" || !canAgentWork}
                onChange={(event) =>
                  updateTicketField("priority", {
                    priority: event.target.value,
                  })
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              {canShowAssignmentSelector ? (
                <select
                  className="field w-auto min-w-[170px] flex-1 lg:max-w-[220px]"
                  value={ticket.assignedTo?._id || ""}
                  disabled={saving === "assign"}
                  onChange={(event) => assignTicket(event.target.value)}
                >
                  <option value="">Assign to...</option>
                  {agents.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-500">
                    Assignment:
                  </span>{" "}
                  <span className="text-slate-700">
                    {ticket.assignedTo?.name || "Unassigned"}
                  </span>
                </div>
              )}

              {isAgent && isUnassigned && (
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  disabled={saving === "assign"}
                  onClick={() => assignTicket()}
                >
                  <UserCheck className="h-4 w-4" />
                  {saving === "assign" ? "Assigning..." : "Assign to me"}
                </button>
              )}

              {isAgent && isAssignedToCurrentUser && (
                <button
                  type="button"
                  className="btn-secondary shrink-0 cursor-not-allowed opacity-60"
                  disabled
                >
                  <UserCheck className="h-4 w-4" />
                  Assigned to you
                </button>
              )}

              {isAgent && isAssignedToAnotherAgent && (
                <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Assigned to{" "}
                  <span className="font-semibold">
                    {ticket.assignedTo?.name}
                  </span>
                  .
                </div>
              )}
            </div>
          </section>
        )}

        <div className="rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">Conversation</h2>

          <div className="mt-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`rounded-md border p-4 ${
                  message.isInternal
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {message.sender?.name} · {message.sender?.role}
                    {message.isInternal && (
                      <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">
                        Internal note
                      </span>
                    )}
                  </span>

                  <span>{formatDate(message.createdAt)}</span>
                </div>

                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                  {message.message}
                </p>
              </div>
            ))}
          </div>

          {canUseMessageComposer && (
            <form onSubmit={submitReply} className="mt-6 grid gap-3">
              {isSupport && (
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white text-sm font-semibold shadow-sm">
                  <button
                    type="button"
                    className={`px-4 py-2 transition-colors ${
                      messageMode === "reply"
                        ? "bg-teal-600 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setMessageMode("reply")}
                  >
                    Reply to customer
                  </button>

                  <button
                    type="button"
                    className={`px-4 py-2 transition-colors ${
                      messageMode === "internal"
                        ? "bg-amber-500 text-white"
                        : "text-slate-700 hover:bg-amber-50"
                    }`}
                    onClick={() => setMessageMode("internal")}
                  >
                    Internal note
                  </button>
                </div>
              )}

              {isSupport && messageMode === "internal" && (
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  Internal notes are visible only to support staff.
                </p>
              )}

              {isAgent && (
                <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                  You can reply or add an internal note only when this ticket is
                  assigned to you.
                </p>
              )}

              <textarea
                className="field min-h-28"
                disabled={saving === "message" || !canUseMessageComposer}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder={
                  messageMode === "internal"
                    ? "Add an internal note"
                    : "Write a reply"
                }
              />

              {isSupport && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="field flex-1"
                    value=""
                    onChange={(event) => {
                      const savedReply = savedReplies.find(
                        (item) => item._id === event.target.value,
                      );

                      if (savedReply) {
                        setReply((current) =>
                          current
                            ? `${current}\n\n${savedReply.content}`
                            : savedReply.content,
                        );
                      }
                    }}
                  >
                    <option value="">Insert saved reply</option>

                    {savedReplies.map((savedReply) => (
                      <option key={savedReply._id} value={savedReply._id}>
                        {savedReply.title}
                      </option>
                    ))}
                  </select>

                  <Link
                    to="/saved-replies"
                    className="btn-secondary shrink-0 justify-center"
                  >
                    Manage replies
                  </Link>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-fit"
                disabled={saving === "message" || !reply.trim()}
              >
                <Send className="h-4 w-4" />

                {saving === "message"
                  ? "Sending..."
                  : messageMode === "internal"
                    ? "Add note"
                    : "Send reply"}
              </button>
            </form>
          )}

          {!canUseMessageComposer && isAgent && isAssignedToAnotherAgent && (
            <p className="mt-6 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
              This ticket is currently assigned to {ticket.assignedTo?.name}.
              You can view the ticket, but you cannot modify it.
            </p>
          )}

          {!canUseMessageComposer &&
            !isAgent &&
            user?.role === "customer" &&
            ticket.status === "CLOSED" && (
              <p className="mt-6 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                Closed tickets cannot receive customer replies. Please create a
                new support request.
              </p>
            )}
        </div>

        {isSupport && (
          <section className="rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">Internal tags</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {(ticket.tags || []).length === 0 && (
                <span className="text-sm text-slate-600">No tags yet.</span>
              )}

              {(ticket.tags || []).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="badge hover:bg-red-100 hover:text-red-700"
                  disabled={isAgent && !isAssignedToCurrentUser}
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </button>
              ))}
            </div>

            {canAgentWork && (
              <div className="mt-4 flex gap-2">
                <input
                  className="field"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder="Add tag"
                />

                <button
                  type="button"
                  className="btn-secondary px-3"
                  onClick={addTag}
                  disabled={saving === "tags"}
                >
                  <Tag className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>
        )}

        <div className="rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">Attachments</h2>

          <div className="mt-4 space-y-2">
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-600">No attachments yet.</p>
            ) : (
              attachments.map((attachment) => (
                <a
                  key={attachment._id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm hover:border-brand"
                  href={`${api.defaults.baseURL}/tickets/${id}/attachments/${attachment._id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-slate-500" />

                    {attachment.originalName}

                    {attachment.isInternal && (
                      <span className="badge bg-amber-100 text-amber-800">
                        internal
                      </span>
                    )}
                  </span>

                  <span className="text-xs text-slate-500">
                    {Math.ceil(attachment.size / 1024)} KB
                  </span>
                </a>
              ))
            )}
          </div>

          {canUseMessageComposer && (
            <div className="mt-4 grid gap-3">
              <input
                className="field"
                type="file"
                multiple
                onChange={(event) =>
                  setSelectedFiles(Array.from(event.target.files || []))
                }
              />

              <button
                type="button"
                className="btn-secondary w-fit"
                disabled={
                  saving === "attachments" || selectedFiles.length === 0
                }
                onClick={uploadFiles}
              >
                <Paperclip className="h-4 w-4" />

                {saving === "attachments" ? "Uploading..." : "Upload files"}
              </button>
            </div>
          )}
        </div>

        {user?.role === "customer" && (canSubmitFeedback || satisfaction) && (
          <div className="rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">Support feedback</h2>

            {satisfaction ? (
              <div className="mt-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
                Thanks for your feedback. Rating: {satisfaction.rating}/5
              </div>
            ) : (
              <form onSubmit={submitSatisfaction} className="mt-4 grid gap-3">
                <label className="text-sm font-semibold">
                  Rating
                  <select
                    className="field mt-1"
                    value={feedback.rating}
                    onChange={(event) =>
                      setFeedback({
                        ...feedback,
                        rating: Number(event.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>

                <textarea
                  className="field min-h-24"
                  placeholder="Optional comment"
                  value={feedback.comment}
                  onChange={(event) =>
                    setFeedback({
                      ...feedback,
                      comment: event.target.value,
                    })
                  }
                />

                <button
                  type="submit"
                  className="btn-primary w-fit"
                  disabled={saving === "satisfaction"}
                >
                  <Star className="h-4 w-4" />

                  {saving === "satisfaction"
                    ? "Submitting..."
                    : "Submit feedback"}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">Activity</h2>

          <div
            ref={activityRef}
            className="mt-4 h-80 space-y-3 overflow-y-auto pr-2"
          >
            {sortedActivity.length === 0 ? (
              <p className="text-sm text-slate-600">
                No activity recorded yet.
              </p>
            ) : (
              sortedActivity.map((item) => (
                <div
                  key={item._id}
                  className="border-l-2 border-slate-200 pl-3 text-sm"
                >
                  <p className="font-medium text-slate-700">
                    {activityText(item)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">Ticket details</h2>

          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Customer</dt>
              <dd className="mt-1">
                {ticket.customer?.name}

                {isSupport && (
                  <span className="block text-slate-500">
                    {ticket.customer?.email}
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">Department</dt>
              <dd className="mt-1">{ticket.department?.name}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">Category</dt>
              <dd className="mt-1">{ticket.category?.name}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">Request type</dt>
              <dd className="mt-1">{ticket.requestType?.name}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">Assigned agent</dt>
              <dd className="mt-1">
                {ticket.assignedTo?.name || "Unassigned"}
              </dd>
            </div>

            {isSupport && (
              <>
                <div>
                  <dt className="font-semibold text-slate-500">SLA</dt>
                  <dd className="mt-1">
                    {ticket.sla?.state} - {ticket.sla?.remaining}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    First response
                  </dt>
                  <dd className="mt-1">{formatDate(ticket.firstResponseAt)}</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">Resolved</dt>
                  <dd className="mt-1">{formatDate(ticket.resolvedAt)}</dd>
                </div>
              </>
            )}

            <div>
              <dt className="font-semibold text-slate-500">Created</dt>
              <dd className="mt-1">{formatDate(ticket.createdAt)}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">Updated</dt>
              <dd className="mt-1">{formatDate(ticket.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        {isSupport && customFieldEntries.length > 0 && (
          <section className="rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">Form fields</h2>

            <dl className="mt-4 grid gap-3 text-sm">
              {customFieldEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold text-slate-500">{key}</dt>

                  <dd className="mt-1">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </aside>
    </div>
  );
}
