import Link from "next/link";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignIn = mode === "sign-in";

  return (
    <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
      <div className="bg-slate-900 p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
          {isSignIn ? "Welcome back" : "Get started"}
        </p>
        <h1 className="display-font mt-4 text-4xl font-semibold">
          {isSignIn ? "Sign in to manage routes." : "Create your MVP demo account."}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
          Use a placeholder login flow for now. The UI is structured for future email auth, magic links, and OAuth integration.
        </p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold hover:bg-white/12"
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold hover:bg-white/12"
          >
            Continue with Microsoft
          </button>
        </div>
      </div>

      <div className="p-8 sm:p-10">
        <div className="grid gap-4">
          <label className="text-sm font-medium text-slate-700">
            Email
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
          </label>
          {!isSignIn ? (
            <label className="text-sm font-medium text-slate-700">
              Organization
              <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            </label>
          ) : null}
          <label className="text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-700"
          >
            {isSignIn ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            Send magic link
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          {isSignIn ? "New to FridgeToFarm?" : "Already have an account?"}{" "}
          <Link
            href={isSignIn ? "/auth/sign-up" : "/auth/sign-in"}
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            {isSignIn ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>
    </section>
  );
}
