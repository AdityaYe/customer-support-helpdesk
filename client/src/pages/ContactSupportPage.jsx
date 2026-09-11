import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LifeBuoy,
  Paperclip,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import api from "../services/api.js";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ContactSupportPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [requestType, setRequestType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    description: "",
  });

  const [customFields, setCustomFields] = useState({});
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      name: user.name || "",
      email: user.email || "",
    }));
  }, [user?.name, user?.email]);

  useEffect(() => {
    let active = true;

    const loadRequestType = async () => {
      try {
        setLoading(true);
        setPageError("");

        const response = await api.get(`/request-types/${id}`);

        if (!active) return;

        const data = response.data.data;

        setRequestType(data);

        setForm((current) => ({
          ...current,
          subject:
            location.state?.prefill?.subject ||
            current.subject ||
            data?.name ||
            "",
          description:
            location.state?.prefill?.description || current.description || "",
        }));
      } catch (error) {
        if (!active) return;

        setPageError(
          error.response?.data?.message ||
            "Unable to load this support request form.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRequestType();

    return () => {
      active = false;
    };
  }, [id, location.state]);

  const customFieldDefinitions = useMemo(() => {
    if (Array.isArray(requestType?.formFields)) return requestType.formFields;
    if (Array.isArray(requestType?.customFields)) return requestType.customFields;
    return [];
  }, [requestType]);

  const category = requestType?.category;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateCustomField = (fieldName, value) => {
    setCustomFields((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const addFiles = (incomingFiles) => {
    const selected = Array.from(incomingFiles || []);

    setSubmitError("");

    if (!selected.length) return;

    setFiles((current) => {
      const merged = [...current];

      for (const file of selected) {
        const alreadyAdded = merged.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        );

        if (alreadyAdded) continue;

        if (file.size > MAX_FILE_SIZE) {
          setSubmitError(
            `${file.name} is larger than the 5 MB attachment limit.`,
          );
          continue;
        }

        if (merged.length >= MAX_FILES) {
          setSubmitError(`You can attach up to ${MAX_FILES} files.`);
          break;
        }

        merged.push(file);
      }

      return merged;
    });
  };

  const removeFile = (index) => {
    setFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
    setSubmitError("");
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitError("");

    if (!form.subject.trim()) {
      setSubmitError("Please enter a subject.");
      return;
    }

    if (!form.description.trim()) {
      setSubmitError("Please describe the issue or request.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/tickets", {
        requestType: id,
        subject: form.subject.trim(),
        description: form.description.trim(),
        customFields,
      });

      const ticket = response.data.data;

      let attachmentNotice = "";

      if (files.length) {
        try {
          const formData = new FormData();

          files.forEach((file) => {
            formData.append("attachments", file);
          });

          await api.post(`/tickets/${ticket._id}/attachments`, formData);
        } catch (attachmentError) {
          attachmentNotice =
            attachmentError.response?.data?.message ||
            "Your ticket was created, but the attachments could not be uploaded.";
        }
      }

      navigate(`/tickets/${ticket._id}`, {
        replace: true,
        state: attachmentNotice ? { notice: attachmentNotice } : undefined,
      });
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          "Unable to submit your request right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (pageError || !requestType) {
    return (
      <div className="page-container">
        <ErrorState message={pageError || "Request type not found."} />
      </div>
    );
  }

  return (
    <div className="page-container max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/help" className="transition hover:text-slate-900">
          Help Center
        </Link>

        <ChevronRight className="h-4 w-4" />

        {category && (
          <>
            <Link
              to={`/categories/${category._id}`}
              className="transition hover:text-slate-900"
            >
              {category.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}

        <span className="font-medium text-slate-900">Contact support</span>
      </div>

      <div className="mb-8">
        <Link
          to={category ? `/categories/${category._id}` : "/help"}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to help center
        </Link>

        <div className="surface overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {requestType.name}
              </h1>

              {requestType.description && (
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  {requestType.description}
                </p>
              )}
            </div>

            {requestType.department?.name && (
              <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                {requestType.department.name}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-8">
                <section>
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Your details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      We&apos;ll use these details to follow up on your request.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Name
                      </span>
                      <input
                        className="field"
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        placeholder="Your name"
                        readOnly={Boolean(user?.name)}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Email
                      </span>
                      <input
                        type="email"
                        className="field"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder="you@example.com"
                        readOnly={Boolean(user?.email)}
                      />
                    </label>
                  </div>
                </section>

                <section className="border-t border-slate-200 pt-8">
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Request details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Include enough detail for the support team to understand
                      the issue without needing to start from scratch.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Subject
                      </span>
                      <input
                        className="field"
                        value={form.subject}
                        onChange={(event) =>
                          updateField("subject", event.target.value)
                        }
                        placeholder="Briefly describe the issue"
                        maxLength={200}
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Description
                      </span>
                      <textarea
                        className="field min-h-[180px] resize-y"
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        placeholder="Describe what you were trying to do, what happened, and any relevant details."
                        required
                      />
                    </label>
                  </div>
                </section>

                {customFieldDefinitions.length > 0 && (
                  <section className="border-t border-slate-200 pt-8">
                    <div className="mb-5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Additional information
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">
                        A few more details
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        These fields help route and resolve your request faster.
                      </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {customFieldDefinitions.map((field) => {
                        const fieldName =
                          field.name || field.key || field.label;

                        if (!fieldName) return null;

                        const label = field.label || field.name || field.key;
                        const value = customFields[fieldName] ?? "";

                        if (
                          field.type === "textarea" ||
                          field.inputType === "textarea"
                        ) {
                          return (
                            <label
                              key={fieldName}
                              className="block sm:col-span-2"
                            >
                              <span className="mb-2 block text-sm font-semibold text-slate-700">
                                {label}
                                {field.required && (
                                  <span className="ml-1 text-rose-500">*</span>
                                )}
                              </span>

                              <textarea
                                className="field min-h-[130px] resize-y"
                                value={value}
                                onChange={(event) =>
                                  updateCustomField(
                                    fieldName,
                                    event.target.value,
                                  )
                                }
                                required={field.required}
                              />
                            </label>
                          );
                        }

                        if (field.type === "select" || field.options) {
                          const options = Array.isArray(field.options)
                            ? field.options
                            : [];

                          return (
                            <label key={fieldName} className="block">
                              <span className="mb-2 block text-sm font-semibold text-slate-700">
                                {label}
                                {field.required && (
                                  <span className="ml-1 text-rose-500">*</span>
                                )}
                              </span>

                              <select
                                className="field"
                                value={value}
                                onChange={(event) =>
                                  updateCustomField(
                                    fieldName,
                                    event.target.value,
                                  )
                                }
                                required={field.required}
                              >
                                <option value="">Select an option</option>

                                {options.map((option) => {
                                  const optionValue =
                                    typeof option === "object"
                                      ? option.value
                                      : option;

                                  const optionLabel =
                                    typeof option === "object"
                                      ? option.label || option.value
                                      : option;

                                  return (
                                    <option
                                      key={String(optionValue)}
                                      value={optionValue}
                                    >
                                      {optionLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                          );
                        }

                        return (
                          <label key={fieldName} className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">
                              {label}
                              {field.required && (
                                <span className="ml-1 text-rose-500">*</span>
                              )}
                            </span>

                            <input
                              type={field.type || field.inputType || "text"}
                              className="field"
                              value={value}
                              onChange={(event) =>
                                updateCustomField(fieldName, event.target.value)
                              }
                              required={field.required}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="border-t border-slate-200 pt-8">
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Attachments
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Screenshots, documents, or other files that help explain
                      the issue.
                    </p>
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center transition hover:border-teal-300 hover:bg-teal-50/30"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
                      <Upload className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-900">
                      Drop files here or browse
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Up to {MAX_FILES} files, 5 MB each
                    </p>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary mt-4"
                    >
                      <Paperclip className="h-4 w-4" />
                      Choose files
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {submitError && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <p className="max-w-md text-xs leading-5 text-slate-500">
                      Your request will be routed to the appropriate support
                      team. You&apos;ll be able to track updates from your
                      ticket.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary min-h-11 px-6"
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="surface-soft p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <LifeBuoy className="h-5 w-5" />
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-slate-950">
                    What happens next?
                  </h2>

                  <div className="mt-5 space-y-5">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Your request is created
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          A ticket number will be assigned to your request.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Support reviews it
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          The request is routed to the relevant team.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          You get updates
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Follow the conversation and status from your ticket.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Need to add something later?
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          You can continue the conversation after the ticket is
                          created.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <p className="text-xs leading-5 text-slate-500">
                      Only include information relevant to your support request.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
