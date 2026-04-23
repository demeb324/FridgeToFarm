"use client";
import { useEffect, useMemo, useRef } from "react";
import { APIProvider, Map, Marker, useApiIsLoaded, useMap } from "@vis.gl/react-google-maps";
import type { RouteRow } from "@/lib/api/client";
import { routeColor } from "@/lib/routes/route-color";

const MAP_ID = "fridge-to-farm-routes";

type Props = {
  routes: RouteRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function SelectedOverlay({ route }: { route: RouteRow }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const points = useMemo(() => {
    try { return decodePolyline(route.route_polyline); } catch { return []; }
  }, [route.route_polyline]);

  const markers = useMemo(() => {
    const result: Array<{ lat: number; lng: number; label: string }> = [];

    result.push({ lat: route.start_lat, lng: route.start_lng, label: "A" });

    const stops = route.route_stops ?? [];
    for (let i = 0; i < stops.length; i++) {
      const letter = LETTERS[i + 1];
      if (letter) {
        result.push({ lat: stops[i].latitude, lng: stops[i].longitude, label: letter });
      }
    }

    const lastLetter = LETTERS[stops.length + 1];
    result.push({ lat: route.end_lat, lng: route.end_lng, label: lastLetter });

    return result;
  }, [route.start_lat, route.start_lng, route.route_stops, route.end_lat, route.end_lng]);

  useEffect(() => {
    if (!map) return;
    polylineRef.current?.setMap(null);
    if (points.length > 1) {
      const poly = new google.maps.Polyline({
        path: points,
        strokeColor: routeColor(route.id),
        strokeWeight: 4,
        strokeOpacity: 0.9,
      });
      poly.setMap(map);
      polylineRef.current = poly;
    }
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: route.start_lat, lng: route.start_lng });
    bounds.extend({ lat: route.end_lat, lng: route.end_lng });
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 80);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (typeof z === "number" && z > 12) map.setZoom(12);
    });
    return () => {
      polylineRef.current?.setMap(null);
      google.maps.event.removeListener(listener);
    };
  }, [map, points, route.id, route.start_lat, route.start_lng, route.end_lat, route.end_lng]);

  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.label}
          position={{ lat: m.lat, lng: m.lng }}
          label={m.label}
        />
      ))}
    </>
  );
}

function AllPinsFit({ routes, selectedId }: { routes: RouteRow[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || selectedId) return;
    if (routes.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const r of routes) bounds.extend({ lat: r.start_lat, lng: r.start_lng });
    map.fitBounds(bounds, 80);
  }, [map, routes, selectedId]);
  return null;
}

function RoutePins({ routes, selectedId, onSelect }: Props) {
  const apiLoaded = useApiIsLoaded();
  if (!apiLoaded) return null;
  return (
    <>
      {routes.map((route) => (
        <Marker
          key={route.id}
          position={{ lat: route.start_lat, lng: route.start_lng }}
          onClick={() => onSelect(route.id)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: routeColor(route.id),
            fillOpacity: route.id === selectedId ? 1 : 0.85,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: route.id === selectedId ? 11 : 8,
          }}
        />
      ))}
    </>
  );
}

export function RouteMap({ routes, selectedId, onSelect }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const selected = routes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="h-full w-full">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 35.0844, lng: -106.6504 }}
          defaultZoom={8}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <RoutePins routes={routes} selectedId={selectedId} onSelect={onSelect} />
          {selected && <SelectedOverlay route={selected} />}
          <AllPinsFit routes={routes} selectedId={selectedId} />
        </Map>
      </APIProvider>
    </div>
  );
}
