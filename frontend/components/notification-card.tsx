import type { FarmerNotification } from "@/lib/types";

export function NotificationCard({
  notification,
  dark = false,
}: {
  notification: FarmerNotification;
  dark?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.5rem] border p-4 ${
        dark
          ? "border-white/10 bg-white/8 text-stone-50"
          : "border-slate-200 bg-slate-50 text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{notification.sender}</p>
        <span className={`text-xs ${dark ? "text-stone-300" : "text-slate-500"}`}>{notification.timestamp}</span>
      </div>
      <p className={`mt-3 text-sm leading-6 ${dark ? "text-stone-200" : "text-slate-600"}`}>
        {notification.message}
      </p>
    </article>
  );
}
