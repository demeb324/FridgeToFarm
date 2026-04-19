import Link from "next/link";

export function SidebarNav({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <nav className="mt-6 grid gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-950"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 rounded-[1.5rem] bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Empty state ready</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          When there are no active routes or pickups, this panel can host onboarding prompts or support contact details.
        </p>
      </div>
    </aside>
  );
}
