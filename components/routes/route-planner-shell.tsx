"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RebroadcastResult, type RouteCreatePayload, type NearbyFarmer } from "@/lib/api/client";
import { RouteList } from "./route-list";
import { RouteMap } from "./route-map";
import { RouteEditor, type EditorSubmit } from "./route-editor";

type Props = { hubId: string };

export function RoutePlannerShell({ hubId }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "create">("view");
  const [rebroadcast, setRebroadcast] = useState<RebroadcastResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [notifySms, setNotifySms] = useState(true);

  const routesQ = useQuery({ queryKey: ["routes", hubId], queryFn: () => api.listRoutes(hubId) });
  const driversQ = useQuery({ queryKey: ["drivers", hubId], queryFn: () => api.listDrivers(hubId) });
  const farmersQ = useQuery({
    queryKey: ["nearby-farmers", selectedId],
    queryFn: () => api.listNearbyFarmers(selectedId!),
    enabled: !!selectedId,
  });

  const selected = routesQ.data?.find((r) => r.id === selectedId) ?? null;
  const editorMode: "empty" | "view" | "create" =
    mode === "create" ? "create" : selected ? "view" : "empty";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["routes", hubId] });

  const updateMut = useMutation({
    mutationFn: (input: { id: string; payload: Parameters<typeof api.updateRoute>[1] }) =>
      api.updateRoute(input.id, input.payload),
    onSuccess: (res) => {
      setRebroadcast(res.rebroadcast ?? null);
      setErrorMsg(null);
      setFieldError(null);
      invalidate();
    },
    onError: (e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : "Update failed");
      setFieldError(e instanceof Error && "field" in e ? { field: (e as Error & { field?: string }).field!, message: e.message } : null);
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: RouteCreatePayload) => {
      const created = await api.createRoute({ ...payload, hub_id: hubId });
      if (notifySms) {
        await api.publishRoute(created.id);
      }
      return created;
    },
    onSuccess: async (created) => {
      setErrorMsg(null);
      setFieldError(null);
      await invalidate();
      setMode("view");
      setSelectedId(created.id);
    },
    onError: (e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : "Create failed");
      setFieldError(e instanceof Error && "field" in e ? { field: (e as Error & { field?: string }).field!, message: e.message } : null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => {
      setSelectedId(null);
      setRebroadcast(null);
      setErrorMsg(null);
      invalidate();
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Delete failed"),
  });

  const handleSelect = (id: string) => {
    setMode("view");
    setSelectedId(id);
    setRebroadcast(null);
    setErrorMsg(null);
    setFieldError(null);
  };

  const handleCreateNew = () => {
    setMode("create");
    setSelectedId(null);
    setRebroadcast(null);
    setErrorMsg(null);
    setFieldError(null);
  };

  const handleSubmit = (submit: EditorSubmit) => {
    setRebroadcast(null);
    if (submit.mode === "update") {
      updateMut.mutate({ id: submit.id, payload: { ...submit.payload, notify_sms: notifySms } });
    } else {
      createMut.mutate(submit.payload);
    }
  };

  const handleCancel = () => {
    setMode("view");
    if (selectedId == null) {
      // leaving create mode with nothing selected → empty
    }
    setErrorMsg(null);
    setFieldError(null);
    setRebroadcast(null);
  };

  if (routesQ.isLoading || driversQ.isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-stone-600">Loading…</div>;
  }
  if (routesQ.isError || driversQ.isError) {
    return (
      <button type="button"
              onClick={() => { routesQ.refetch(); driversQ.refetch(); }}
              className="m-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Failed to load. Tap to retry.
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
      <div className="flex shrink-0 items-center justify-end border-b border-stone-200 bg-stone-50 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-stone-600">
            Notify farmers via SMS on save
          </label>
        <button
          type="button"
          role="switch"
          aria-checked={notifySms}
          onClick={() => setNotifySms((s) => !s)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifySms ? "bg-amber-600" : "bg-stone-300"}`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${notifySms ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
      <RouteList
        routes={routesQ.data ?? []}
        selectedId={selectedId}
        mode={mode}
        onSelect={handleSelect}
        onCreateNew={handleCreateNew}
      />
      <div className="min-w-0 flex-1">
        <RouteMap
          routes={routesQ.data ?? []}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>
      <RouteEditor
        mode={editorMode}
        route={selected ?? undefined}
        drivers={driversQ.data ?? []}
        nearbyFarmers={editorMode === "create" ? [] : (farmersQ.data ?? [])}
        onSubmit={handleSubmit}
        onDelete={(id) => deleteMut.mutate(id)}
        onCancel={handleCancel}
        busy={updateMut.isPending || createMut.isPending || deleteMut.isPending}
        lastRebroadcast={rebroadcast}
        errorMessage={errorMsg}
        fieldError={fieldError}
      />
      </div>
    </div>
  );
}
