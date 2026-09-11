import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  LifeBuoy,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import api from "../services/api.js";

export default function FaqPage() {
  const { id } = useParams();

  const [requestType, setRequestType] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setFeedback(null);

    api
      .get(`/request-types/${id}`)
      .then((res) => {
        setRequestType(res.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load this article.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleFeedback = (value) => {
    setFeedback(value);
  };

  if (loading) {
    return <LoadingState label="Loading article..." />;
  }

  return (
    <div className="page-container pb-6 pt-4 sm:pt-5">
      <ErrorState message={error} />

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

        {requestType?.category?._id ? (
          <>
            <Link
              to={`/categories/${requestType.category._id}`}
              className="font-medium text-slate-500 transition hover:text-teal-700"
            >
              {requestType.category.name}
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          </>
        ) : null}

        <span className="truncate font-semibold text-slate-800">
          {requestType?.name || "Article"}
        </span>
      </nav>

      {!requestType ? (
        <div className="surface-soft p-10 text-center">
          <h1 className="text-lg font-bold text-slate-900">
            Article not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This help article may have been removed or is no longer published.
          </p>

          <Link to="/" className="btn-secondary mt-5">
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-w-0">
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-br from-teal-50/70 via-white to-white px-6 py-6 sm:px-7 sm:py-7">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {requestType.faqTitle}
                </h1>

                <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  {requestType.description || requestType.name}
                </p>
              </div>

              <div className="px-6 py-5 sm:px-7 sm:py-6">
                <div className="max-w-3xl whitespace-pre-line text-[15px] leading-6.5 text-slate-700">
                  {requestType.faqContent}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-7">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
                    {feedback ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <LifeBuoy className="h-5 w-5" />
                    )}
                  </div>

                  <h2 className="mt-3 text-base font-bold text-slate-900">
                    {feedback
                      ? "Thanks for your feedback"
                      : "Was this article helpful?"}
                  </h2>

                  {feedback ? (
                    <>
                      <p className="mt-1 text-sm text-slate-500">
                        Your feedback helps us improve our support content.
                      </p>

                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
                        onClick={() => setFeedback(null)}
                      >
                        Change your response
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-slate-500">
                        Let us know whether you found what you were looking for.
                      </p>

                      <div className="mt-4 flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleFeedback("yes")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Yes, this helped
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleFeedback("no")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not quite
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <Link
                to={
                  requestType.category?._id
                    ? `/categories/${requestType.category._id}`
                    : "/"
                }
                className="btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to category
              </Link>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="surface-soft p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <LifeBuoy className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Need more help?
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-5.5 text-slate-500">
                This article didn't solve the problem? Send a request to our
                support team.
              </p>

              <Link
                to={`/contact-support/${requestType._id}`}
                state={{
                  prefill: {
                    subject: requestType.name,
                    description:
                      requestType.description || requestType.faqContent || "",
                  },
                }}
                className="btn-primary mt-4 w-full"
              >
                Contact support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="surface-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Article details
              </p>

              <dl className="mt-3.5 space-y-3 text-sm">
                {requestType.category?.name && (
                  <div>
                    <dt className="text-xs font-medium text-slate-400">
                      Category
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-700">
                      {requestType.category.name}
                    </dd>
                  </div>
                )}

                {requestType.department?.name && (
                  <div>
                    <dt className="text-xs font-medium text-slate-400">
                      Support team
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-700">
                      {requestType.department.name}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs font-medium text-slate-400">Topic</dt>
                  <dd className="mt-1 font-semibold text-slate-700">
                    {requestType.name}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
