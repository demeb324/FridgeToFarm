import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            Agri
          </div>
          <div>
            <p className="display-font text-lg font-semibold text-slate-900">Agri Vida</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rural logistics MVP</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/fertilizer" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Fertilizer
          </Link>
          <Link href="/driver" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Driver View
          </Link>
          <Link href="/farmer" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Farmer View
          </Link>
          <Link href="/hub" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Hub Dashboard
          </Link>
          <Link href="/routes" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Route Planning
          </Link>
        </nav>

      </div>
    </header>
  );
}
