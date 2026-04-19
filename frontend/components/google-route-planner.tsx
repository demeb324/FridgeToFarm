"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, Marker, Polyline } from "@vis.gl/react-google-maps";
import type { RouteScenario } from "@/lib/types";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

type MarkerPoint = {
  id: string;
  label: string;
  title: string;
  kind: "origin" | "pickup" | "destination";
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

  const path = projectedMarkers.map((marker) => `${marker.canvas.x},${marker.canvas.y}`).join(" ");

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#edf4ef_0%,#dfe9e0_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.16),transparent_24%),radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />
      <svg viewBox={`0 0 ${width} ${height}`} className="relative h-full w-full">
        <polyline
          points={path}
          fill="none"
          stroke="#0f766e"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {projectedMarkers.map((marker) => (
          <g key={marker.id} transform={`translate(${marker.canvas.x}, ${marker.canvas.y})`}>
            <circle
              r={marker.kind === "pickup" ? 18 : 22}
              fill={
                marker.kind === "origin"
                  ? "#0f172a"
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

  return allStops
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
    })
    .filter((marker): marker is MarkerPoint => marker !== null);
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
  compact = false,
}: {
  scenarios: RouteScenario[];
  compact?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];

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

  return (
    <section className="h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className={`grid h-full ${compact ? "xl:grid-cols-[340px_minmax(0,1fr)]" : "xl:grid-cols-[380px_minmax(0,1fr)]"}`}>
        <aside className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-6 xl:border-b-0 xl:border-r">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Google Maps route planner</p>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Demo route
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
                  {markers.length > 1 ? (
                    <Polyline
                      path={markers.map((marker) => marker.position)}
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
                      label={{
                        text: marker.label,
                        color: marker.kind === "destination" ? "#92400e" : "#0f172a",
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
                Start: <span className="font-semibold">S</span> · Destination: <span className="font-semibold">D</span> · Pickups: numbered stops in between
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
