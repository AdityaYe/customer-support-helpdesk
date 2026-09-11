import {
  ArrowRight,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ErrorState from "../components/ErrorState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      navigate(redirectTo, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to sign in. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-center p-10 xl:p-16">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Get help, track requests, and stay informed.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Access your support conversations, follow ticket updates, and
                connect with the right team from one place.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  [
                    ShieldCheck,
                    "Secure account access",
                    "Your support activity stays inside your workspace.",
                  ],
                  [
                    Headphones,
                    "One support workspace",
                    "Tickets, conversations, attachments, and updates in one place.",
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

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-6 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-4">
              <Link
                to="/help"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
              </Link>
            </div>

            <div className="surface p-6 sm:p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Sign in
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Sign in to continue to your support workspace.
                </p>
              </div>

              <ErrorState message={error} />

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  className="btn-primary min-h-11 w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs font-medium text-slate-400">
                  New to the portal?
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link to="/register" className="btn-secondary w-full">
                Create an account
              </Link>
            </div>

            <p className="mt-4 pb-12 text-center text-xs text-slate-400">
              Need an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
