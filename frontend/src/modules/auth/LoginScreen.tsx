import { FC, FormEvent, useState } from "react";
import Mascot from "@/components/mascot/Mascot";
import { ApiError } from "@/api/client";
import { useAuth } from "./AuthProvider";

const LoginScreen: FC = () => {
  const { login, errorMessage } = useAuth();
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't sign you in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-brand/10 backdrop-blur sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-2xl bg-brand-soft p-2">
            <Mascot mood="happy" size={46} />
          </div>
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight">hearty</p>
            <p className="text-sm text-muted">Your health, in a clearer rhythm.</p>
          </div>
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in to see your health dashboard and ask Hearty about your data.
        </p>
        <div className="mt-5 rounded-2xl border border-brand/10 bg-brand-soft/65 px-4 py-3 text-sm text-brand">
          <span className="font-bold">Demo access</span>
          <span className="ml-2">user / 123456</span>
          <p className="mt-1 text-xs text-muted">
            Shared account with fictional data. Please don't enter private health information.
          </p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Username
            <input
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>
          {errorMessage && !error && (
            <p role="status" className="rounded-xl bg-brand-soft px-3.5 py-3 text-sm text-brand">
              {errorMessage}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          <button
            disabled={isSubmitting}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginScreen;
