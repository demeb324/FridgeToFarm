type Status = "Open" | "Confirmed" | "Closed" | "Draft" | "In Transit";

const badgeStyles: Record<Status, string> = {
  Open: "bg-emerald-100 text-emerald-800",
  Confirmed: "bg-sky-100 text-sky-800",
  Closed: "bg-slate-200 text-slate-700",
  Draft: "bg-amber-100 text-amber-800",
  "In Transit": "bg-violet-100 text-violet-800",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[status]}`}>
      {status}
    </span>
  );
}
