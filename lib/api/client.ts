// lib/api/client.ts
import type { DriverRouteAssignment, FarmerNotification } from "@/lib/types";

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error || `Request failed (${res.status})`);
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
    http<Array<Record<string, unknown>>>(hubId ? `/api/routes?hub_id=${hubId}` : "/api/routes"),
  createRoute: (payload: Record<string, unknown>) =>
    http<Record<string, unknown> & { id: string }>("/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  publishRoute: (routeId: string) =>
    http<{ farmers_notified: number; notifications: Array<{ status: string }> }>(
      `/api/routes/${routeId}/publish`,
      { method: "PATCH" },
    ),
};
