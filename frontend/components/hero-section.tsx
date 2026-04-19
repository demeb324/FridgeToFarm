import Link from "next/link";

export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-18">
      <div className="flex flex-col justify-center">
        <div className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-800">
          Food access meets route efficiency
        </div>
        <h1 className="display-font mt-6 max-w-3xl text-5xl font-semibold leading-none tracking-tight text-slate-900 sm:text-6xl">
          Rural pickup coordination for crops, deliveries, and return-trip compost.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          FridgeToFarm helps distribution hubs notify nearby farmers when trucks already passing through rural areas can add crop pickups or collect food waste for compost return.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/farmer"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-700"
          >
            Farmer View
          </Link>
          <Link
            href="/hub"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:-translate-y-0.5 hover:border-slate-400"
          >
            Hub Dashboard
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-900 hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            Request Demo
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 translate-x-3 translate-y-4 rounded-[2rem] bg-amber-200/50 blur-3xl" />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(53,76,52,0.45)] backdrop-blur">
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Live route</p>
              <h2 className="mt-3 text-2xl font-semibold">North Valley Return Loop</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Boise Cold Chain is heading back from school deliveries with compost capacity and two open produce pickup slots.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-semibold">Nearby farmers automatically notified</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">18</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Farmer benefit</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Faster access to markets, schools, and restaurants without managing a separate haul.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Hub benefit</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Better route utilization, lighter manual outreach, and a cleaner return-trip story for partners.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-slate-900">MVP focus</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Clean operations views for hubs and simple alert-driven coordination for growers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
