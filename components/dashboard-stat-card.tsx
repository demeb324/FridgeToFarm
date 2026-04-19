export function DashboardStatCard({
  label,
  value,
  detail,
  inverted = false,
}: {
  label: string;
  value: string;
  detail: string;
  inverted?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.75rem] border p-5 ${
        inverted ? "border-white/10 bg-white/7" : "border-white/70 bg-white/85 shadow-sm"
      }`}
    >
      <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${inverted ? "text-emerald-200" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold ${inverted ? "text-white" : "text-slate-900"}`}>{value}</p>
      <p className={`mt-2 text-sm leading-6 ${inverted ? "text-emerald-50/80" : "text-slate-600"}`}>{detail}</p>
    </article>
  );
}
