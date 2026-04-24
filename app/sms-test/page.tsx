"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import type { FarmerSummary } from "@/lib/api/client";
import type { FarmerNotification } from "@/lib/types";

function SmsBubble({ notification }: { notification: FarmerNotification }) {
  return (
    <div className="rounded-xl rounded-bl-sm bg-emerald-100 px-4 py-3 text-sm text-slate-900">
      <p className="font-medium text-emerald-800">{notification.sender}</p>
      <p className="mt-1 whitespace-pre-line">{notification.message}</p>
      <p className="mt-2 text-xs text-emerald-600">{notification.timestamp}</p>
    </div>
  );
}

export default function SmsTestPage() {
  // Dev-only: this page should not be accessible in production
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <p className="text-sm text-slate-600">This page is not available in production.</p>
      </div>
    );
  }

  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");

  const farmersQ = useQuery({
    queryKey: ["farmers"],
    queryFn: () => api.listFarmers(),
  });

  const notificationsQ = useQuery({
    queryKey: ["notifications", selectedFarmerId],
    queryFn: () => api.listNotifications(selectedFarmerId),
    enabled: !!selectedFarmerId,
  });

  const selectedFarmer = farmersQ.data?.find((f) => f.id === selectedFarmerId);

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            SMS Test UI — Development Only
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Use this page to preview what a farmer sees on their phone. Set SMS_DRY_RUN=true to test the full flow without sending real texts.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select a farmer
          </label>
          <select
            value={selectedFarmerId}
            onChange={(e) => setSelectedFarmerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
          >
            <option value="">— Choose a farmer —</option>
            {farmersQ.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.phone}){f.opted_out ? " [OPTED OUT]" : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedFarmer && (
          <div className="rounded-[2rem] border border-slate-900 bg-slate-900 p-2">
            {/* Mock phone frame */}
            <div className="rounded-[1.5rem] bg-stone-100 overflow-hidden">
              {/* Phone header */}
              <div className="bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white">
                Messages — {selectedFarmer.name}
              </div>

              {/* Message area */}
              <div className="p-4 space-y-3 min-h-[300px]">
                {!selectedFarmerId && (
                  <p className="text-sm text-slate-500 text-center">Select a farmer above</p>
                )}
                {notificationsQ.isLoading && (
                  <p className="text-sm text-slate-500 text-center">Loading messages…</p>
                )}
                {notificationsQ.isError && (
                  <p className="text-sm text-red-600 text-center">Failed to load messages.</p>
                )}
                {notificationsQ.data?.length === 0 && (
                  <p className="text-sm text-slate-500 text-center">No messages yet.</p>
                )}
                {notificationsQ.data?.map((n) => (
                  <SmsBubble key={n.id} notification={n} />
                ))}
              </div>

              {/* Mock input bar */}
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-400 text-center">
                  This is a read-only preview. Farmers respond by tapping the link in the SMS.
                </p>
              </div>
            </div>
          </div>
        )}

        {farmersQ.isLoading && <p className="text-sm text-slate-600">Loading farmers…</p>}
      </div>
    </div>
  );
}