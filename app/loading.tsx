export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-16 animate-pulse rounded-3xl bg-white/70" />
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-[2rem] bg-white/70" />
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-[2rem] bg-white/70" />
            <div className="h-[520px] animate-pulse rounded-[2rem] bg-white/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
