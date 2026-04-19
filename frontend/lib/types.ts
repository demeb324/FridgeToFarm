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
