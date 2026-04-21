"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIProvider, Map, Marker, Polyline } from "@vis.gl/react-google-maps";
import type { Driver, RouteScenario } from "@/lib/types";
import { api } from "@/lib/api/client";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

type MarkerPoint = {
  id: string;
  label: string;
  title: string;
  kind: "origin" | "pickup" | "destination" | "fertilizer";
  position: google.maps.LatLngLiteral;
};

type PickupDraft = {
  id: string;
  value: string;
  isApplied: boolean;
};

function createPickupDraft(value: string, isApplied = false): PickupDraft {
  return {
    id: `pickup-draft-${Math.random().toString(36).slice(2, 10)}`,
    value,
    isApplied,
  };
}

function DemoRouteCanvas({ markers }: { markers: MarkerPoint[] }) {
  const padding = 36;
  const width = 900;
  const height = 620;

  if (markers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#edf4ef_0%,#dfe9e0_100%)] p-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No demo route points available.</p>
        </div>
      </div>
    );
  }

  const routeMarkers = markers.filter((marker) => marker.kind !== "fertilizer");
  const latitudes = markers.map((marker) => marker.position.lat);
  const longitudes = markers.map((marker) => marker.position.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  const projectPoint = (point: google.maps.LatLngLiteral) => {
    const x = padding + ((point.lng - minLng) / lngRange) * (width - padding * 2);
    const y = height - padding - ((point.lat - minLat) / latRange) * (height - padding * 2);
    return { x, y };
  };

  const projectedMarkers = markers.map((marker) => ({
    ...marker,
    canvas: projectPoint(marker.position),
  }));

  const path = projectedMarkers
    .filter((marker) => marker.kind !== "fertilizer")
    .map((marker) => `${marker.canvas.x},${marker.canvas.y}`)
    .join(" ");

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#edf4ef_0%,#dfe9e0_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.16),transparent_24%),radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />
      <svg viewBox={`0 0 ${width} ${height}`} className="relative h-full w-full">
        {routeMarkers.length > 1 ? (
          <polyline
            points={path}
            fill="none"
            stroke="#0f766e"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {projectedMarkers.map((marker) => (
          <g key={marker.id} transform={`translate(${marker.canvas.x}, ${marker.canvas.y})`}>
            <circle
              r={marker.kind === "pickup" ? 18 : marker.kind === "fertilizer" ? 20 : 22}
              fill={
                marker.kind === "origin"
                  ? "#0f172a"
                  : marker.kind === "fertilizer"
                    ? "#7c3aed"
                  : marker.kind === "destination"
                    ? "#d97706"
                    : "#16a34a"
              }
              stroke="#ffffff"
              strokeWidth="4"
            />
            <text textAnchor="middle" dy="5" fontSize="14" fontWeight="700" fill="#ffffff">
              {marker.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function toMarkerPoints(
  origin: string,
  destination: string,
  pickups: string[],
  scenario?: RouteScenario,
): MarkerPoint[] {
  const allStops = [
    { id: "origin", label: "S", title: origin, kind: "origin" as const },
    ...pickups
      .filter((pickup) => pickup.trim().length > 0)
      .map((pickup, index) => ({
        id: `pickup-${index + 1}`,
        label: `${index + 1}`,
        title: pickup,
        kind: "pickup" as const,
      })),
    { id: "destination", label: "D", title: destination, kind: "destination" as const },
  ];

  const fallbackStops = scenario?.fallbackStops ?? [];
  const defaultOriginPosition =
    fallbackStops.find((item) => item.kind === "origin")?.position ?? {
      lat: 35.0402,
      lng: -106.609,
    };
  const defaultDestinationPosition =
    fallbackStops.find((item) => item.kind === "destination")?.position ?? {
      lat: 35.687,
      lng: -105.9378,
    };

  const resolvedOriginPosition =
    fallbackStops.find(
      (item) => item.kind === "origin" && item.title.toLowerCase() === origin.toLowerCase(),
    )?.position ?? defaultOriginPosition;
  const resolvedDestinationPosition =
    fallbackStops.find(
      (item) =>
        item.kind === "destination" && item.title.toLowerCase() === destination.toLowerCase(),
    )?.position ?? defaultDestinationPosition;

  const pickupStops = allStops.filter((stop) => stop.kind === "pickup");

  const routeMarkers = allStops
    .map((stop) => {
      if (stop.kind === "origin") {
        return {
          id: stop.id,
          label: stop.label,
          title: stop.title,
          kind: stop.kind,
          position: resolvedOriginPosition,
        } satisfies MarkerPoint;
      }

      if (stop.kind === "destination") {
        return {
          id: stop.id,
          label: stop.label,
          title: stop.title,
          kind: stop.kind,
          position: resolvedDestinationPosition,
        } satisfies MarkerPoint;
      }

      const fallbackStop =
        fallbackStops.find((item) => item.title.toLowerCase() === stop.title.toLowerCase());

      if (fallbackStop) {
        return {
          id: stop.id,
          label: stop.label,
          title: stop.title,
          kind: stop.kind,
          position: fallbackStop.position,
        } satisfies MarkerPoint;
      }

      const pickupIndex = pickupStops.findIndex((pickup) => pickup.id === stop.id);
      const fraction = (pickupIndex + 1) / (pickupStops.length + 1);

      return {
        id: stop.id,
        label: stop.label,
        title: stop.title,
        kind: stop.kind,
        position: {
          lat:
            resolvedOriginPosition.lat +
            (resolvedDestinationPosition.lat - resolvedOriginPosition.lat) * fraction,
          lng:
            resolvedOriginPosition.lng +
            (resolvedDestinationPosition.lng - resolvedOriginPosition.lng) * fraction,
        },
      } satisfies MarkerPoint;
    });

  const fertilizerMarkers =
    scenario?.fertilizerPoints?.map((point) => ({
      id: point.id,
      label: point.label,
      title: point.title,
      kind: "fertilizer" as const,
      position: point.position,
    })) ?? [];

  return [...routeMarkers, ...fertilizerMarkers];
}

function RouteSync({
  origin,
  destination,
  pickups,
  scenario,
  onMarkersChange,
}: {
  origin: string;
  destination: string;
  pickups: string[];
  scenario?: RouteScenario;
  onMarkersChange: (markers: MarkerPoint[]) => void;
}) {
  useEffect(() => {
    onMarkersChange(toMarkerPoints(origin, destination, pickups, scenario));
  }, [destination, onMarkersChange, origin, pickups, scenario]);

  return null;
}

export function GoogleRoutePlanner({
  scenarios,
  hubId,
  compact = false,
}: {
  scenarios: RouteScenario[];
  hubId: string;
  compact?: boolean;
}) {
  const driversQ = useQuery({
    queryKey: ["drivers", hubId],
    queryFn: () => api.listDrivers(hubId),
  });
  const drivers: Driver[] = (driversQ.data ?? []).map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    avatarUrl: d.avatarUrl ?? "",
    vehicle: d.vehicle ?? "",
    phone: d.phone,
    zone: d.zone ?? "",
  }));
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);
  const [driverMenuOpen, setDriverMenuOpen] = useState(false);
  const [routeSent, setRouteSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<{ notified: number; failed: number } | null>(null);

  const publishMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const created = await api.createRoute(payload);
      const pub = await api.publishRoute(created.id);
      return { created, pub };
    },
    onSuccess: ({ pub }) => {
      const notified = pub.farmers_notified ?? 0;
      const failed = (pub.notifications ?? []).filter((n) => n.status === "failed").length;
      setNotifyResult({ notified, failed });
      setRouteSent(true);
    },
    onError: (err) => setSendError(err instanceof Error ? err.message : String(err)),
  });
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id ?? "");
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? drivers[0];

  const [origin, setOrigin] = useState(selectedScenario?.origin ?? "");
  const [destination, setDestination] = useState(selectedScenario?.destination ?? "");
  const [pickups, setPickups] = useState<string[]>(selectedScenario?.pickups ?? []);
  const [draftOrigin, setDraftOrigin] = useState(selectedScenario?.origin ?? "");
  const [draftDestination, setDraftDestination] = useState(selectedScenario?.destination ?? "");
  const [draftPickups, setDraftPickups] = useState<PickupDraft[]>(
    (selectedScenario?.pickups ?? []).map((pickup) => createPickupDraft(pickup, true)),
  );
  const [markers, setMarkers] = useState<MarkerPoint[]>(
    toMarkerPoints(selectedScenario?.origin ?? "", selectedScenario?.destination ?? "", selectedScenario?.pickups ?? [], selectedScenario),
  );
  const routeMarkers = markers.filter((marker) => marker.kind !== "fertilizer");

  const buildMarkerIcon = (marker: MarkerPoint) => {
    if (typeof google === "undefined" || !google.maps) {
      return undefined;
    }

    if (marker.kind === "fertilizer") {
      return {
        url: "/icons/fertilizer-point.png",
        scaledSize: new google.maps.Size(42, 42),
      };
    }

    const fill =
      marker.kind === "origin"
        ? "#0f172a"
        : marker.kind === "destination"
          ? "#d97706"
          : "#16a34a";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="${fill}" stroke="white" stroke-width="4" />
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(44, 44),
      labelOrigin: new google.maps.Point(22, 23),
    };
  };

  useEffect(() => {
    const authFailureHandler = () => {
      setGoogleMapsFailed(true);
    };

    window.gm_authFailure = authFailureHandler;

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  const applyScenario = (scenario: RouteScenario) => {
    setSelectedScenarioId(scenario.id);
    setOrigin(scenario.origin);
    setDestination(scenario.destination);
    setPickups(scenario.pickups);
    setDraftOrigin(scenario.origin);
    setDraftDestination(scenario.destination);
    setDraftPickups(scenario.pickups.map((pickup) => createPickupDraft(pickup, true)));
    setMarkers(toMarkerPoints(scenario.origin, scenario.destination, scenario.pickups, scenario));
    setGoogleMapsFailed(false);
    setRouteSent(false);
    setSendError(null);
  };

  const updateDraftPickup = (pickupId: string, value: string) => {
    setDraftPickups((current) =>
      current.map((pickup) => (pickup.id === pickupId ? { ...pickup, value } : pickup)),
    );
  };

  const applyPickup = (pickupId: string) => {
    const nextDraftPickups = draftPickups.map((pickup) =>
      pickup.id === pickupId ? { ...pickup, isApplied: true } : pickup,
    );
    const nextPickups = nextDraftPickups
      .map((pickup) => pickup.value)
      .filter((pickup) => pickup.trim().length > 0);
    setDraftPickups(nextDraftPickups);
    setPickups(nextPickups);
    setMarkers(toMarkerPoints(origin, destination, nextPickups, selectedScenario));
  };

  const addPickup = () => {
    setDraftPickups((current) => [...current, createPickupDraft("")]);
  };

  const sendRouteToDriver = () => {
    setSendError(null);
    setNotifyResult(null);
    const originMarker = routeMarkers.find((m) => m.kind === "origin");
    const destMarker = routeMarkers.find((m) => m.kind === "destination");
    if (!originMarker || !destMarker) {
      setSendError("Route must have an origin and destination.");
      return;
    }
    if (!selectedDriver) {
      setSendError("Pick a driver before sending the route.");
      return;
    }

    const start = new Date();
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const polyline = routeMarkers
      .map((m) => `${m.position.lat.toFixed(5)},${m.position.lng.toFixed(5)}`)
      .join("|");
    const pickupList = pickups.filter((p) => p.trim().length > 0);
    const notes = pickupList.length ? `Pickups: ${pickupList.join(" -> ")}` : null;

    publishMutation.mutate({
      hub_id: hubId,
      driver_id: selectedDriver.id,
      title: selectedScenario?.title || `Route to ${destination}`,
      route_polyline: polyline || "planner-route",
      start_lat: originMarker.position.lat,
      start_lng: originMarker.position.lng,
      end_lat: destMarker.position.lat,
      end_lng: destMarker.position.lng,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes,
    });
  };

  const removePickup = (pickupId: string) => {
    const nextDraftPickups = draftPickups.filter((pickup) => pickup.id !== pickupId);
    const nextPickups = nextDraftPickups
      .filter((pickup) => pickup.isApplied)
      .map((pickup) => pickup.value)
      .filter((pickup) => pickup.trim().length > 0);
    setPickups(nextPickups);
    setDraftPickups(nextDraftPickups);
    setMarkers(toMarkerPoints(origin, destination, nextPickups, selectedScenario));
  };

  if (driversQ.isLoading) {
    return <p className="p-6 text-sm text-slate-600">Loading planner…</p>;
  }

  return (
    <section className="h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className={`grid h-full ${compact ? "xl:grid-cols-[340px_minmax(0,1fr)]" : "xl:grid-cols-[380px_minmax(0,1fr)]"}`}>
        <aside className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-6 xl:border-b-0 xl:border-r">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Google Maps route planner</p>

          <div className="mt-5">
            <p className="text-sm font-medium text-slate-700">Driver</p>
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setDriverMenuOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {selectedDriver ? (
                    <>
                      <Image
                        src={selectedDriver.avatarUrl}
                        alt={`${selectedDriver.firstName} ${selectedDriver.lastName}`}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedDriver.firstName} {selectedDriver.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{selectedDriver.vehicle}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No driver selected</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-500">Select</span>
              </button>

              {driverMenuOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)]">
                  {drivers.map((driver) => (
                    <button
                      type="button"
                      key={driver.id}
                      onClick={() => {
                        setSelectedDriverId(driver.id);
                        setDriverMenuOpen(false);
                        setRouteSent(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                    >
                      <Image
                        src={driver.avatarUrl}
                        alt={`${driver.firstName} ${driver.lastName}`}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {driver.firstName} {driver.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {driver.zone} · {driver.vehicle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Route
            <select
              value={selectedScenarioId}
              onChange={(event) => {
                const scenario = scenarios.find((item) => item.id === event.target.value);
                if (scenario) {
                  applyScenario(scenario);
                }
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">Start position</label>
            <div className="mt-2 flex gap-2">
              <input
                value={draftOrigin}
                onChange={(event) => setDraftOrigin(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => {
                  setOrigin(draftOrigin);
                  setMarkers(toMarkerPoints(draftOrigin, destination, pickups, selectedScenario));
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">Destination</label>
            <div className="mt-2 flex gap-2">
              <input
                value={draftDestination}
                onChange={(event) => setDraftDestination(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => {
                  setDestination(draftDestination);
                  setMarkers(toMarkerPoints(origin, draftDestination, pickups, selectedScenario));
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Pickup points in between</p>
              <button
                type="button"
                onClick={addPickup}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
              >
                Add pickup
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {draftPickups.map((pickup, index) => (
                <div key={pickup.id} className="flex gap-2">
                  <input
                    value={pickup.value}
                    onChange={(event) => updateDraftPickup(pickup.id, event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  />
                  {pickup.isApplied ? (
                    <button
                      type="button"
                      onClick={() => removePickup(pickup.id)}
                      className="rounded-2xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                      aria-label={`Remove pickup point ${index + 1}`}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyPickup(pickup.id)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                      aria-label={`Apply pickup point ${index + 1}`}
                    >
                      Apply
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Driver route details</p>
            {selectedDriver ? (
              <div className="mt-4 flex items-center gap-3">
                <Image
                  src={selectedDriver.avatarUrl}
                  alt={`${selectedDriver.firstName} ${selectedDriver.lastName}`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedDriver.firstName} {selectedDriver.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDriver.vehicle} · {selectedDriver.zone}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Pickup route</p>
                <p className="mt-1">{origin}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Stops</p>
                <p className="mt-1">
                  {pickups.filter((pickup) => pickup.trim().length > 0).length > 0
                    ? pickups.filter((pickup) => pickup.trim().length > 0).join(" -> ")
                    : "No pickup stops assigned yet"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Drop-off destination</p>
                <p className="mt-1">{destination}</p>
              </div>
              {selectedDriver ? (
                <div>
                  <p className="font-semibold text-slate-900">Driver contact</p>
                  <p className="mt-1">{selectedDriver.phone}</p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={publishMutation.isPending || drivers.length === 0 || !selectedDriver}
              className="mt-4 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              onClick={sendRouteToDriver}
            >
              {publishMutation.isPending ? "Sending…" : "Send route details to driver"}
            </button>
            {drivers.length === 0 && !driversQ.isLoading ? (
              <p className="mt-2 text-xs text-slate-600">No drivers available for this hub.</p>
            ) : null}

            {routeSent ? (
              <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Route details sent{selectedDriver ? ` to ${selectedDriver.firstName} ${selectedDriver.lastName}` : ""}.
              </div>
            ) : null}
            {notifyResult ? (
              <p className="mt-2 text-sm text-emerald-800">
                {notifyResult.notified} farmers notified, {notifyResult.failed} failed.
              </p>
            ) : null}
            {sendError ? (
              <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                Failed to send: {sendError}
              </div>
            ) : null}
          </div>

        </aside>

        <div className="relative min-h-[520px] bg-slate-200 xl:h-full">
          {!apiKey || googleMapsFailed ? (
            <div className="h-full w-full">
              <DemoRouteCanvas markers={markers} />
            </div>
          ) : (
            <div className="h-[520px] xl:h-full">
              <APIProvider
                apiKey={apiKey}
                onError={() => {
                  setGoogleMapsFailed(true);
                }}
              >
                <Map
                  defaultCenter={{ lat: 35.0844, lng: -106.6504 }}
                  defaultZoom={9}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  className="h-full w-full"
                >
                  <RouteSync
                    origin={origin}
                    destination={destination}
                    pickups={pickups}
                    scenario={selectedScenario}
                    onMarkersChange={setMarkers}
                  />
                  {routeMarkers.length > 1 ? (
                    <Polyline
                      path={routeMarkers.map((marker) => marker.position)}
                      strokeColor="#0f766e"
                      strokeOpacity={0.9}
                      strokeWeight={6}
                    />
                  ) : null}
                  {markers.map((marker) => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      title={marker.title}
                      icon={buildMarkerIcon(marker)}
                      label={{
                        text: marker.kind === "fertilizer" ? "" : marker.label,
                        color:
                          marker.kind === "destination"
                            ? "#92400e"
                            : marker.kind === "fertilizer"
                              ? "#581c87"
                              : "#0f172a",
                        fontWeight: "700",
                      }}
                    />
                  ))}
                </Map>
              </APIProvider>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Visible markers</p>
              <p className="mt-1 text-sm text-slate-700">
                Start: <span className="font-semibold">S</span> · Destination: <span className="font-semibold">D</span> · Pickups: numbered stops · Fertilizer: <span className="font-semibold">F</span> markers
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
