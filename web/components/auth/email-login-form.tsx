"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, setStoredAuth } from "@/lib/api-client";

export function EmailLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const auth = mode === "login"
        ? await login(email, password)
        : await register(email, password);

      setStoredAuth(auth);
      router.push("/dashboard");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex gap-2 rounded-md border border-slate-700 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-emerald-500 text-black" : "text-slate-400"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === "register" ? "bg-emerald-500 text-black" : "text-slate-400"}`}
        >
          Register
        </button>
      </div>

      <label className="grid gap-1 text-sm text-slate-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="you@example.com"
        />
      </label>

      <label className="grid gap-1 text-sm text-slate-300">
        Password
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      {message ? <p className="text-sm text-rose-400">{message}</p> : null}
    </form>
  );
}
