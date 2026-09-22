import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileText,
  LifeBuoy,
  Paperclip,
  Send,
  Upload,
  X,
} from "lucide-react";

import api from "../services/api.js";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const requestTypeGuidance = {
  "Payment failed":
    "Please include the transaction ID, amount, and payment method if available.",

  "Payment charged twice": "Please include both transaction IDs if available.",

  "Refund request":
    "Please include your order ID and briefly explain why you are requesting a refund.",

  "Payment pending":
    "Please include the transaction ID if available and mention when the payment was made.",

  "Cannot log in":
    "Please include the account email you are having trouble accessing.",

  "Account locked":
    "Please include the affected account email and briefly describe when the account became locked.",

  "Change account information":
    "Please specify which account information you want to change.",

  "Website not working":
    "Please mention the affected page or URL and which browser you are using.",

  "Application error":
    "Please include the exact error message and the device or platform where it occurred.",

  "Bug report":
    "Please describe the steps that caused the issue and what you expected to happen.",

  "Order problem":
    "Please include your order ID and describe what is incorrect.",

  "Delivery issue":
    "Please include your order ID, tracking number, and describe the delivery issue.",

  "Cancel order":
    "Please include your order ID and confirm that you want to cancel the order.",

  "Suspicious account activity":
    "Please describe the suspicious activity, including anything unusual you noticed.",

  "Unrecognized activity":
    "Please describe the activity you do not recognize and approximately when you noticed it.",
};

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
    if (Array.isArray(requestType?.formFields)) {
      return requestType.formFields;
    }

    if (Array.isArray(requestType?.customFields)) {
      return requestType.customFields;
    }

    return [];
  }, [requestType]);

  const category = requestType?.category;

  const guidanceText = requestType ? requestTypeGuidance[requestType.name] : "";

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
    return <LoadingState label="Loading support request..." />;
  }

  if (pageError || !requestType) {
    return (
      <div className="page-container py-6">
        <ErrorState message={pageError || "Request type not found."} />
      </div>
    );
  }

  return (
    <div className="page-container w-full !max-w-6xl pb-8 pt-4 sm:pt-5">
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-1.5 text-sm"
      >
        <Link
          to="/"
          className="font-medium text-slate-500 transition hover:text-teal-700"
        >
          Help Center
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />

        {category?._id ? (
          <>
            <Link
              to={`/categories/${category._id}`}
              className="font-medium text-slate-500 transition hover:text-teal-700"
            >
              {category.name}
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          </>
        ) : null}

        <span className="truncate font-semibold text-slate-800">
          Contact support
        </span>
      </nav>

      <div className="mb-5">
        <Link
          to={category ? `/categories/${category._id}` : "/"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to category
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="min-w-0">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-br from-teal-50/70 via-white to-white px-6 py-6 sm:px-7 sm:py-7">
              <div className="px-2 sm:px-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {requestType.name}
                </h1>

                {requestType.description && (
                  <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                    {requestType.description}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6 sm:px-7 sm:py-7">
                <section>
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Step 1
                    </p>

                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                      Your details
                    </h2>
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

                <section className="mt-8 border-t border-slate-100 pt-8">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Step 2
                    </p>

                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                      Tell us about the issue
                    </h2>
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

                      {guidanceText && (
                        <p className="mt-2 text-xs italic leading-5 text-slate-400">
                          {guidanceText}
                        </p>
                      )}
                    </label>
                  </div>
                </section>

                {customFieldDefinitions.length > 0 && (
                  <section className="mt-8 border-t border-slate-100 pt-8">
                    <div className="mb-5">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Additional details
                      </h2>
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

                <section className="mt-8 border-t border-slate-100 pt-8">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Step 3
                    </p>

                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                      Attachments
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
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
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
                      <Clock3 className="h-4 w-4" />
                    </div>

                    <p className="text-sm leading-5 text-slate-600">
                      <span className="font-semibold text-slate-900">
                        Expected response time:
                      </span>{" "}
                      A support agent will typically send the first response
                      within 1–24 hours, depending on the priority of your
                      request.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary min-h-11 shrink-0 px-6"
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mt-4">
            <Link to={`/requests/${requestType._id}`} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to article
            </Link>
          </div>
        </main>

        <aside className="space-y-4">
          <div className="surface-soft p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <LifeBuoy className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Your request
                </p>

                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {requestType.name}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
              {category?.name ? (
                <div>
                  <dt className="text-xs font-medium text-slate-400">
                    Category
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-700">
                    {category.name}
                  </dd>
                </div>
              ) : null}

              {requestType.department?.name ? (
                <div>
                  <dt className="text-xs font-medium text-slate-400">
                    Support team
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-700">
                    {requestType.department.name}
                  </dd>
                </div>
              ) : null}

              <div>
                <dt className="text-xs font-medium text-slate-400">
                  Attachments
                </dt>

                <dd className="mt-1 font-semibold text-slate-700">
                  Up to {MAX_FILES} files
                </dd>
              </div>
            </dl>
          </div>

          <div className="surface-soft p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                  What happens next?
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  1
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Request created
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A ticket number will be assigned to your request.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  2
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Support reviews it
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The request is routed to the relevant support team.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
