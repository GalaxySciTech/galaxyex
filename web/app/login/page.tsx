import Link from "next/link";
import { EmailLoginForm } from "@/components/auth/email-login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <section>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">GalaxyEx Access</p>
          <h1 className="mt-3 text-4xl font-semibold">Sign in with email link</h1>
          <p className="mt-4 text-slate-300">
            MVP authentication is powered by Supabase Auth. Once logged in, route users to dashboard,
            trade, earn, wallet and admin views based on role.
          </p>
          <div className="mt-6 flex gap-3 text-sm">
            <Link href="/dashboard" className="rounded-md border border-slate-700 px-3 py-2">
              Continue as demo
            </Link>
          </div>
        </section>

        <EmailLoginForm />
      </div>
    </main>
  );
}
