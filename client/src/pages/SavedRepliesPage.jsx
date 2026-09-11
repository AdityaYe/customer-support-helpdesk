import {
  BookOpenText,
  CheckCircle2,
  Edit3,
  Globe2,
  Plus,
  Save,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

const blankForm = {
  title: "",
  content: "",
  active: true,
};

const scopeInfo = {
  PERSONAL: {
    label: "Personal",
    description: "Only you can use and manage this reply.",
    icon: UserRound,
    badge: "bg-slate-100 text-slate-700",
  },
  DEPARTMENT: {
    label: "Department",
    description: "Available to support users in your department.",
    icon: UsersRound,
    badge: "bg-teal-50 text-teal-700",
  },
  GLOBAL: {
    label: "Global",
    description: "Available to all support users.",
    icon: Globe2,
    badge: "bg-indigo-50 text-indigo-700",
  },
};

const displayScope = (reply) => reply?.scope || "GLOBAL";

export default function SavedRepliesPage() {
  const { user } = useAuth();

  const [replies, setReplies] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = user?.role;

  const myScope = useMemo(() => {
    if (role === "agent") return "PERSONAL";
    if (role === "manager") return "DEPARTMENT";
    return "GLOBAL";
  }, [role]);

  const canEditReply = (reply) => {
    const scope = displayScope(reply);

    if (role === "admin") return true;

    if (role === "agent") {
      return (
        scope === "PERSONAL" &&
        String(reply.createdBy?._id || reply.createdBy || "") ===
          String(user?._id)
      );
    }

    if (role === "manager") {
      if (scope === "DEPARTMENT") return true;

      return (
        scope === "PERSONAL" &&
        String(reply.createdBy?._id || reply.createdBy || "") ===
          String(user?._id)
      );
    }

    return false;
  };

  const loadReplies = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/saved-replies");
      setReplies(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load saved replies.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplies();
  }, []);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId("");
  };

  const startEdit = (reply) => {
    setEditingId(reply._id);
    setForm({
      title: reply.title || "",
      content: reply.content || "",
      active: reply.active !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveReply = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Both title and content are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        await api.patch(`/saved-replies/${editingId}`, form);
        setSuccess("Saved reply updated successfully.");
      } else {
        await api.post("/saved-replies", form);
        setSuccess("Saved reply created successfully.");
      }

      resetForm();
      await loadReplies();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save this reply.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteReply = async (id) => {
    if (!window.confirm("Delete this saved reply? This cannot be undone.")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.delete(`/saved-replies/${id}`);
      setSuccess("Saved reply deleted successfully.");

      if (editingId === id) {
        resetForm();
      }

      await loadReplies();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete this reply.",
      );
    }
  };

  if (loading) {
    return <LoadingState label="Loading saved replies..." />;
  }

  const info = scopeInfo[myScope];
  const ScopeIcon = info.icon;

  return (
    <div className="page-container max-w-5xl">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Saved replies
        </h1>
      </header>

      <div className="space-y-5">
        <ErrorState message={error} />

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <section className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {editingId ? "Edit reply" : "Create reply"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {info.label} saved reply
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {info.description}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  info.badge.split(" ")[0]
                } ${info.badge.split(" ")[1] || ""}`}
              >
                <ScopeIcon className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-5">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Title
                </span>
                <input
                  className="field"
                  value={form.title}
                  placeholder="Example: Password reset response"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Reply content
                </span>
                <textarea
                  className="field min-h-40 resize-y"
                  value={form.content}
                  placeholder="Write the reusable support response..."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                  checked={Boolean(form.active)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                Reply active
              </label>

              <div className="flex gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={saveReply}
                >
                  {editingId ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create reply"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" />
                    Cancel editing
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Existing replies
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Replies available to you.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {replies.length}
              </span>
            </div>
          </div>

          {replies.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpenText className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-4 text-sm font-semibold text-slate-700">
                No saved replies yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {replies.map((reply) => {
                const replyScope = displayScope(reply);
                const replyInfo = scopeInfo[replyScope] || scopeInfo.GLOBAL;
                const ReplyScopeIcon = replyInfo.icon;
                const editable = canEditReply(reply);

                return (
                  <div
                    key={reply._id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {reply.title}
                        </h3>

                        <span
                          className={`badge ${replyInfo.badge}`}
                        >
                          <ReplyScopeIcon className="mr-1 h-3.5 w-3.5" />
                          {replyInfo.label}
                        </span>

                        {reply.active !== false && (
                          <span className="badge bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {reply.content}
                      </p>

                      {reply.department?.name && (
                        <span className="mt-3 inline-flex badge bg-teal-50 text-teal-700">
                          {reply.department.name}
                        </span>
                      )}
                    </div>

                    {editable && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => startEdit(reply)}
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn-secondary px-3 text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                          onClick={() => deleteReply(reply._id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
