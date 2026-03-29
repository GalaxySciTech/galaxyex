"use client";

import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Supabase env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Magic link sent. Check your inbox.");
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <label className="grid gap-1 text-sm text-slate-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="founder@galaxyex.io"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {loading ? "Sending..." : "Email login"}
      </button>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </form>
  );
}
