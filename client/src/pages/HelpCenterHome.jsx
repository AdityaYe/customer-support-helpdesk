import {
  CreditCard,
  KeyRound,
  Package,
  Search,
  ShieldCheck,
  UserRound,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import api from "../services/api.js";

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

const getCategoryVisual = (categoryName = "") => {
  const normalized = categoryName.toLowerCase();
  return (
    categoryVisuals.find((v) =>
      v.keywords.some((k) => normalized.includes(k)),
    ) || { icon: UserRound, iconClass: "bg-slate-100 text-slate-600" }
  );
};

const getRequestSituation = (description = "") => {
  const text = description.trim().replace(/\.$/, "");

  const transformations = [
    [/^Your account is (.+)$/i, (_, v) => `My account is ${v}`],
    [/^You see (.+)$/i, (_, v) => `I see ${v}`],
    [/^Report (.+)$/i, (_, v) => `I want to report ${v}`],
    [/^Cancel (.+)$/i, (_, v) => `I want to cancel ${v}`],
    [/^You cannot (.+)$/i, (_, v) => `I cannot ${v}`],
    [/^Update (.+)$/i, (_, v) => `I want to update ${v}`],
    [/^Recover (.+)$/i, (_, v) => `I want to recover ${v}`],
    [/^Fix (.+)$/i, (_, v) => `I want to fix ${v}`],
    [/^Get help with (.+)$/i, (_, v) => `I need help with ${v}`],
    [
      /^Report website, application, and bug issues$/i,
      () => `I want to report a website, application, or bug issue`,
    ],
    [/^Questions about (.+)$/i, (_, v) => `I have questions about ${v}`],
    [/^Your delivery is (.+)$/i, (_, v) => `My delivery is ${v}`],
  ];

  for (const [pattern, replacer] of transformations) {
    if (pattern.test(text)) return text.replace(pattern, replacer);
  }

  return text;
};

export default function HelpCenterHome() {
  const [categories, setCategories] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const canContactSupport = !user || user.role === "customer";

  useEffect(() => {
    Promise.all([api.get("/categories"), api.get("/request-types")])
      .then(([categoryRes, requestRes]) => {
        setCategories(categoryRes.data.data);
        setRequestTypes(requestRes.data.data);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Could not load the help center.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    if (!normalizedSearch) return requestTypes.slice(0, 8);
    return requestTypes.filter((item) =>
      [
        item.name,
        item.description,
        item.faqTitle,
        item.faqContent,
        item.category?.name,
        item.department?.name,
      ].some((v) => v?.toLowerCase().includes(normalizedSearch)),
    );
  }, [requestTypes, normalizedSearch]);

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories.filter((c) =>
      [c.name, c.description, c.department?.name].some((v) =>
        v?.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [categories, normalizedSearch]);

  if (loading) return <LoadingState label="Loading help center..." />;

  return (
    <div className="page-container help-center-page overflow-hidden">
      <ErrorState message={error} />

      <div className="help-center-content">
        <div className="help-center-main">
          <section className="help-hero">
            <div className="help-hero-content px-6 py-6 sm:px-8 sm:py-7 lg:px-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-teal-300 uppercase tracking-widest">
                    Support Center
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    How can we help you?
                  </h1>
                </div>

                <div className="search-shell w-full lg:max-w-lg">
                  <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    className="search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for answers or topics..."
                    aria-label="Search help center"
                  />
                  {search && (
                    <button
                      type="button"
                      className="mr-2 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setSearch("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {normalizedSearch && (
            <section className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">
                {filteredRequests.length === 0
                  ? `No results for "${search}"`
                  : `${filteredRequests.length} result${filteredRequests.length !== 1 ? "s" : ""} for "${search}"`}
              </p>

              {filteredRequests.length === 0 ? (
                <div className="surface p-10 text-center">
                  <Search className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No articles matched your search
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try different keywords or browse categories below.
                  </p>
                </div>
              ) : (
                <div className="surface overflow-hidden">
                  {filteredRequests.map((requestType) => (
                    <Link
                      key={requestType._id}
                      to={`/request-types/${requestType._id}`}
                      className="request-row group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700 transition-colors">
                          {requestType.name}
                        </p>
                        {requestType.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {requestType.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {!normalizedSearch && (
            <div className="help-center-normal-content">
              <section className="help-center-category-section">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Browse by category
                </p>

                {filteredCategories.length === 0 ? (
                  <div className="surface p-5 text-sm text-slate-500">
                    No categories match your search.
                  </div>
                ) : (
                  <div className="help-center-category-strip">
                    {filteredCategories.map((category) => {
                      const visual = getCategoryVisual(category.name);
                      const Icon = visual.icon;

                      return (
                        <Link
                          key={category._id}
                          to={`/categories/${category._id}`}
                          className="help-center-category-card group"
                        >
                          <div className={`category-icon ${visual.iconClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="help-center-category-card-content">
                            <h3 className="group-hover:text-brand-700 transition-colors">
                              {category.name}
                            </h3>
                            <p>{category.description}</p>
                            <span>{category.department?.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="help-center-lower-section">
                <div className="help-center-lower-grid">
                  <div className="help-center-popular surface overflow-hidden">
                    <div className="help-center-section-heading">
                      <h2>Popular requests</h2>
                    </div>

                    {filteredRequests.length === 0 ? (
                      <div className="px-5 py-5 text-sm text-slate-400">
                        No help articles are available yet.
                      </div>
                    ) : (
                      <div className="help-center-request-list">
                        {filteredRequests.map((requestType) => (
                          <Link
                            key={requestType._id}
                            to={`/contact-support/${requestType._id}`}
                            state={{
                              prefill: {
                                subject: requestType.name,
                                description: requestType.description
                                  ? getRequestSituation(requestType.description)
                                  : "",
                              },
                            }}
                            className="help-center-request-item group"
                          >
                            <p className="help-center-request-situation group-hover:text-slate-700 transition-colors">
                              {getRequestSituation(requestType.description)}
                            </p>
                            <span className="help-center-request-department">
                              {requestType.department?.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="help-center-support surface overflow-hidden">
                    <div className="help-center-support-panel">
                      <div className="help-center-support-icon">
                        <HeadsetIcon />
                      </div>

                      <h2>Still can't find what you need?</h2>

                      <p>
                        Our support team is here to help with any questions.
                      </p>

                      {requestTypes[0] &&
                        (canContactSupport ? (
                          <Link
                            to={`/contact-support/${requestTypes[0]._id}`}
                            className="btn-primary help-center-support-action"
                          >
                            Contact support
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="btn-primary help-center-support-action cursor-not-allowed opacity-50"
                          >
                            Contact support
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeadsetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 13v-1a8 8 0 0 1 16 0v1"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 13h2a2 2 0 0 1 2 2v2H6a2 2 0 0 1-2-2v-2Zm16 0h-2a2 2 0 0 0-2 2v2h2a2 2 0 0 0 2-2v-2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h3" />
    </svg>
  );
}
