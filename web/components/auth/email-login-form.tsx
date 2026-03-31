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
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setMessage(""); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === "login" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-slate-200"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setMessage(""); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === "register" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-slate-200"}`}
        >
          Register
        </button>
      </div>

      <div className="grid gap-1">
        <label className="text-xs text-slate-400">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-xs text-slate-400">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition disabled:opacity-50"
      >
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      {message && (
        <div className="rounded-lg border border-rose-800/50 bg-rose-950/30 px-3 py-2.5 text-xs text-rose-400">
          {message}
        </div>
      )}

      {mode === "login" && (
        <p className="text-center text-xs text-slate-500">
          Demo: <span className="font-mono">demo@galaxyex.io</span> / <span className="font-mono">demo1234</span>
        </p>
      )}
    </form>
  );
}
