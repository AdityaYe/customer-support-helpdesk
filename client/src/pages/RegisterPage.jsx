import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ErrorState from "../components/ErrorState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const passwordRules = [
  "Use at least 8 characters",
  "Include a mix of letters and numbers",
];

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard", {
        replace: true,
      });
    }
  }, [user, navigate]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const passwordLengthValid = form.password.length >= 8;
  const passwordHasNumber = /\d/.test(form.password);

  const passwordsMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute -bottom-48 -right-28 h-[32rem] w-[32rem] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-center p-10 xl:p-14">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Keep every support request in one place.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Create an account to submit requests, follow conversations,
                receive updates, and review your ticket history.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  [
                    CheckCircle2,
                    "Track your tickets",
                    "See status changes, replies, attachments, and activity.",
                  ],
                  [
                    ShieldCheck,
                    "Stay informed",
                    "Receive notifications as your support requests change.",
                  ],
                  [
                    Headphones,
                    "Reach the right team",
                    "Requests can be routed to the appropriate support department.",
                  ],
                ].map(([Icon, title, description]) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">{title}</p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-5 sm:px-8">
          <div className="w-full max-w-lg">
            <div className="surface p-6 sm:p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Create your account
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Set up your customer account to start using the support
                  portal.
                </p>
              </div>

              <ErrorState message={error} />

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Full name
                  </span>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      className="field !pl-10"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email address
                  </span>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      className="field !pl-10"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Password
                  </span>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      className="field !pl-10"
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                      placeholder="Create a password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-700">
                    Password requirements
                  </p>

                  <div className="mt-2 space-y-1.5">
                    <PasswordRule
                      text={passwordRules[0]}
                      valid={passwordLengthValid}
                    />

                    <PasswordRule
                      text={passwordRules[1]}
                      valid={passwordHasNumber}
                    />
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Confirm password
                  </span>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      className={`field !pl-10 ${
                        form.confirmPassword && !passwordsMatch
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                          : ""
                      }`}
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {form.confirmPassword && !passwordsMatch && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                      Passwords do not match.
                    </p>
                  )}

                  {passwordsMatch && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Passwords match.
                    </p>
                  )}
                </label>

                <button
                  type="submit"
                  className="btn-primary min-h-11 w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-4 pb-12 text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PasswordRule({ text, valid }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        valid ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      <CheckCircle2
        className={`h-3.5 w-3.5 ${
          valid ? "text-emerald-500" : "text-slate-300"
        }`}
      />

      <span>{text}</span>
    </div>
  );
}
