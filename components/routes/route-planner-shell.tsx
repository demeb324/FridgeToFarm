"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RebroadcastResult } from "@/lib/api/client";
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

  const routesQ = useQuery({ queryKey: ["routes", hubId], queryFn: () => api.listRoutes(hubId) });
  const driversQ = useQuery({ queryKey: ["drivers", hubId], queryFn: () => api.listDrivers(hubId) });

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
      invalidate();
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Update failed"),
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const created = await api.createRoute({ ...payload, hub_id: hubId });
      await api.publishRoute(created.id);
      return created;
    },
    onSuccess: async (created) => {
      setErrorMsg(null);
      await invalidate();
      setMode("view");
      setSelectedId(created.id);
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Create failed"),
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
  };

  const handleCreateNew = () => {
    setMode("create");
    setSelectedId(null);
    setRebroadcast(null);
    setErrorMsg(null);
  };

  const handleSubmit = (submit: EditorSubmit) => {
    setRebroadcast(null);
    if (submit.mode === "update") {
      updateMut.mutate({ id: submit.id, payload: submit.payload });
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
    <div className="flex h-full overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
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
        onSubmit={handleSubmit}
        onDelete={(id) => deleteMut.mutate(id)}
        onCancel={handleCancel}
        busy={updateMut.isPending || createMut.isPending || deleteMut.isPending}
        lastRebroadcast={rebroadcast}
        errorMessage={errorMsg}
      />
    </div>
  );
}
