import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
  KeyRound,
  Package,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const categoryVisuals = [
  {
    keywords: ["account", "access", "login"],
    icon: KeyRound,
    iconClass: "bg-teal-50 text-teal-700",
  },
  {
    keywords: ["security", "secure"],
    icon: ShieldCheck,
    iconClass: "bg-violet-50 text-violet-700",
  },
  {
    keywords: ["order", "delivery", "shipping"],
    icon: Package,
    iconClass: "bg-sky-50 text-sky-700",
  },
  {
    keywords: ["payment", "billing", "refund"],
    icon: CreditCard,
    iconClass: "bg-amber-50 text-amber-700",
  },
  {
    keywords: ["technical", "tech", "bug", "application"],
    icon: Wrench,
    iconClass: "bg-rose-50 text-rose-700",
  },
];

function getCategoryVisual(categoryName = "") {
  const normalized = categoryName.toLowerCase();

  return (
    categoryVisuals.find((visual) =>
      visual.keywords.some((keyword) => normalized.includes(keyword)),
    ) || {
      icon: FileText,
      iconClass: "bg-slate-100 text-slate-600",
    }
  );
}

export default function CategoryPage() {
  const { id } = useParams();

  const [category, setCategory] = useState(null);
  const [requestTypes, setRequestTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const canContactSupport = !user || user.role === "customer";

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      api.get(`/categories/${id}`),
      api.get(`/request-types?category=${id}`),
    ])
      .then(([categoryRes, requestRes]) => {
        setCategory(categoryRes.data.data);
        setRequestTypes(requestRes.data.data);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Could not load this category.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filteredRequestTypes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return requestTypes;
    }

    return requestTypes.filter((requestType) =>
      [
        requestType.name,
        requestType.description,
        requestType.faqTitle,
        requestType.faqContent,
      ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [requestTypes, search]);

  if (loading) {
    return <LoadingState label="Loading category..." />;
  }

  const visual = getCategoryVisual(category?.name);
  const CategoryIcon = visual.icon;

  return (
    <div className="page-container py-5 sm:py-6">
      <ErrorState message={error} />

      {category && (
        <section className="mb-5">
          <Link
            to="/help"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>

          <div className="surface overflow-hidden">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${visual.iconClass}`}
                >
                  <CategoryIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {category.name}
                    </h1>

                    {category.department?.name && (
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {category.department.name}
                      </span>
                    )}
                  </div>

                  {category.description && (
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full shrink-0 lg:max-w-md">
                <div className="search-shell border-slate-200">
                  <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />

                  <input
                    className="search-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${category.name}...`}
                    aria-label="Search this category"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mr-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {search ? "Search results" : "Browse all topics"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {search
              ? `${filteredRequestTypes.length} result${
                  filteredRequestTypes.length === 1 ? "" : "s"
                }`
              : `${requestTypes.length} article${
                  requestTypes.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        {filteredRequestTypes.length === 0 ? (
          <div className="surface p-8 text-center">
            <h3 className="text-sm font-semibold text-slate-800">
              No articles found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try a different search term.
            </p>

            {search && (
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="surface overflow-hidden">
            {filteredRequestTypes.map((requestType) => (
              <Link
                key={requestType._id}
                to={`/requests/${requestType._id}`}
                className="group flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50 sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                    {requestType.name}
                  </h3>

                  {(requestType.description || requestType.faqTitle) && (
                    <p className="mt-1 text-sm text-slate-500">
                      {requestType.description || requestType.faqTitle}
                    </p>
                  )}
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-teal-700" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="surface-soft mt-5 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Didn't find the answer?
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Send us the details and we'll route your request to the right
            support team.
          </p>
        </div>

        {requestTypes[0] ? (
          canContactSupport ? (
            <Link
              to={`/contact-support/${requestTypes[0]._id}`}
              className="btn-primary w-full sm:w-fit"
            >
              Contact support
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="btn-primary w-full sm:w-fit cursor-not-allowed opacity-50"
            >
              Contact support
              <ArrowRight className="h-4 w-4" />
            </button>
          )
        ) : (
          <Link to="/help" className="btn-secondary w-full sm:w-fit">
            Return to Help Center
          </Link>
        )}
      </section>
    </div>
  );
}
