export type Status = "Open" | "Confirmed" | "Closed" | "Draft" | "In Transit";

export type PickupOpportunity = {
  id: string;
  routeName: string;
  farmArea: string;
  contactName: string;
  contactPhone: string;
  pickupWindow: string;
  destination: string;
  notes: string;
  status: Extract<Status, "Open" | "Confirmed" | "Closed">;
};

export type FarmerNotification = {
  id: string;
  sender: string;
  timestamp: string;
  message: string;
};

export type RoutePlan = {
  id: string;
  title: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: Status;
  nearbyFarmers: number;
  pickupRequests: number;
  stops: string[];
};

export type RouteScenario = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  pickups: string[];
  notes: string;
  fallbackStops?: Array<{
    id: string;
    label: string;
    title: string;
    kind: "origin" | "pickup" | "destination";
    position: {
      lat: number;
      lng: number;
    };
  }>;
  fertilizerPoints?: Array<{
    id: string;
    title: string;
    label: string;
    position: {
      lat: number;
      lng: number;
    };
  }>;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  vehicle: string;
  phone: string;
  zone: string;
};

export type DriverRouteStatus = "Waiting" | "Started" | "In Progress" | "Completed";

export type DriverRouteAssignment = {
  id: string;
  driverId: string;
  routeTitle: string;
  pickupSource: string;
  destination: string;
  pickupWindow: string;
  material: string;
  notes: string;
  status: DriverRouteStatus;
};

export type CapacityEstimateRole = "distributor" | "farmer";

export type CapacityEstimateResult = {
  summary: string;
  estimatedFillPercentage: number;
  estimatedFloorCoveragePercentage: number;
  estimatedHeightUsagePercentage: number;
  estimatedUsedVolume: number;
  estimatedRemainingVolume: number;
  fitStatus: "fits_comfortably" | "fits_tightly" | "likely_over_capacity" | "unclear";
  confidence: "low" | "medium" | "high";
  visibleCues: string[];
  assumptions: string[];
  safetyNotes: string[];
};
