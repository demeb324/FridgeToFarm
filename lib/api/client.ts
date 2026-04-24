// lib/api/client.ts
import type { DriverRouteAssignment, FarmerNotification } from "@/lib/types";

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as { error?: string; message?: string })?.error || (body as { message?: string })?.message || `Request failed (${res.status})`);
    (err as Error & { field?: string }).field = (body as { field?: string }).field;
    throw err;
  }
  return res.json() as Promise<T>;
}

export type HubSummary = { id: string; name: string; phone: string; email: string };
export type HubStats = { nearbyGrowers: number; pickupRequests: number; activeTrips: number };
export type DriverSummary = {
  id: string; hubId: string; firstName: string; lastName: string;
  phone: string; vehicle: string | null; zone: string | null; avatarUrl: string | null;
};
export type FarmerOpportunity = {
  routeId: string; routeTitle: string; hubName: string;
  routeDate: string; pickupWindow: string; destination: string; distanceMiles: number;
};

export type RouteStop = {
  id: string;
  order_index: number;
  address: string;
  name: string | null;
  latitude: number;
  longitude: number;
};

export type RouteRow = {
  id: string;
  hub_id: string;
  title: string;
  start_address: string;
  end_address: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  route_polyline: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  published: boolean;
  created_at: string;
  hubs?: { id: string; name: string; phone: string; email: string } | null;
  route_stops: RouteStop[];
};

export type RouteStop_Input = { address: string; name?: string | null };

export type RouteUpdatePayload = Partial<{
  title: string;
  driver_id: string;
  start_address: string;
  end_address: string;
  stops: RouteStop_Input[];
  start_time: string;
  end_time: string;
  notes: string | null;
  notify_sms: boolean;
}>;

export type RouteCreatePayload = {
  hub_id: string;
  driver_id: string;
  title: string;
  start_address: string;
  end_address: string;
  stops: RouteStop_Input[];
  start_time: string;
  end_time: string;
  notes?: string | null;
  notify_sms?: boolean;
};

export type RebroadcastResult = {
  farmers_notified: number;
  notifications: Array<{ farmer_id: string; status: "sent" | "failed" }>;
};

export type NearbyFarmer = {
  farmer_id: string;
  farmer_name: string;
  phone: string;
  address_text: string;
  latitude: number;
  longitude: number;
  min_distance_miles: number;
};

export type FarmerSummary = {
  id: string;
  name: string;
  phone: string;
  address_text: string;
  opted_out: boolean;
  created_at: string;
};

export type FarmerDetail = FarmerSummary & {
  latitude: number;
  longitude: number;
  updated_at: string;
};

export type FarmerResponseItem = {
  id: string;
  route_id: string;
  route_title: string;
  response_type: "crop_pickup" | "compost_pickup" | "both";
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
};

export const api = {
  listHubs: () => http<HubSummary[]>("/api/hubs"),
  hubStats: (hubId: string) => http<HubStats>(`/api/hubs/${hubId}/stats`),
  listDrivers: (hubId?: string) =>
    http<DriverSummary[]>(hubId ? `/api/drivers?hub_id=${hubId}` : "/api/drivers"),
  listAssignments: (driverId: string) =>
    http<DriverRouteAssignment[]>(`/api/drivers/${driverId}/assignments`),
  updateAssignmentStatus: (driverId: string, assignmentId: string, status: string) =>
    http<{ id: string; status: string }>(
      `/api/drivers/${driverId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ),
  listOpportunities: (farmerId: string) =>
    http<FarmerOpportunity[]>(`/api/farmers/${farmerId}/opportunities`),
  listNotifications: (farmerId: string) =>
    http<FarmerNotification[]>(`/api/farmers/${farmerId}/notifications`),
  listRoutes: (hubId?: string) =>
    http<RouteRow[]>(hubId ? `/api/routes?hub_id=${hubId}` : "/api/routes"),
  createRoute: (payload: RouteCreatePayload) =>
    http<RouteRow>("/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateRoute: (routeId: string, payload: RouteUpdatePayload) =>
    http<{ route: RouteRow; rebroadcast?: RebroadcastResult }>(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteRoute: (routeId: string) =>
    fetch(`/api/routes/${routeId}`, { method: "DELETE" }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
    }),
  publishRoute: (routeId: string) =>
    http<{ farmers_notified: number; notifications: Array<{ status: string }> }>(
      `/api/routes/${routeId}/publish`,
      { method: "PATCH" },
    ),
  listNearbyFarmers: (routeId: string) =>
    http<NearbyFarmer[]>(`/api/routes/${routeId}/nearby-farmers`),

  listFarmers: (search?: string) =>
    http<FarmerSummary[]>(search ? `/api/farmers?search=${encodeURIComponent(search)}` : "/api/farmers"),

  updateFarmer: (id: string, payload: { name?: string; phone?: string; address_text?: string; opted_out?: boolean }) =>
    http<FarmerDetail>(`/api/farmers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),

  listFarmerResponses: (farmerId: string) =>
    http<FarmerResponseItem[]>(`/api/farmers/${farmerId}/responses`),
};
