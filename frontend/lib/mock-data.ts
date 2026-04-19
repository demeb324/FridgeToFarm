import type {
  Driver,
  DriverRouteAssignment,
  FarmerNotification,
  PickupOpportunity,
  RoutePlan,
  RouteScenario,
} from "@/lib/types";

export const heroStats = [
  {
    label: "Routes this week",
    value: "24",
    detail: "Mock regional trips that can carry produce or compost loads.",
  },
  {
    label: "Farmers notified",
    value: "142",
    detail: "Nearby growers matched to routes based on geography and timing.",
  },
  {
    label: "Return compost runs",
    value: "9",
    detail: "Backhaul opportunities that keep trucks useful in both directions.",
  },
];

export const pickupOpportunities: PickupOpportunity[] = [
  {
    id: "opp-1",
    routeName: "Snake River Produce Loop",
    farmArea: "Near Parma, ID",
    contactName: "Lena Ortiz",
    contactPhone: "(208) 555-0132",
    pickupWindow: "Tue, Apr 21 · 7:30 AM - 9:00 AM",
    destination: "Boise Co-op and North End School Kitchen",
    notes: "Small pallet space available. Reply by 5 PM to confirm.",
    status: "Open",
  },
  {
    id: "opp-2",
    routeName: "North Valley Return Loop",
    farmArea: "Near Emmett, ID",
    contactName: "Marcus Hill",
    contactPhone: "(208) 555-0160",
    pickupWindow: "Wed, Apr 22 · 2:00 PM - 4:00 PM",
    destination: "Treasure Valley Restaurant Group",
    notes: "Truck returning with compost capacity after restaurant drop-off.",
    status: "Confirmed",
  },
  {
    id: "opp-3",
    routeName: "Canyon Schools Route",
    farmArea: "Near Caldwell, ID",
    contactName: "Tara Singh",
    contactPhone: "(208) 555-0181",
    pickupWindow: "Thu, Apr 23 · 6:45 AM - 8:00 AM",
    destination: "West Canyon School District",
    notes: "Closed route kept visible for recent history and planning context.",
    status: "Closed",
  },
];

export const farmerNotifications: FarmerNotification[] = [
  {
    id: "note-1",
    sender: "Boise Cold Chain",
    timestamp: "Today · 9:12 AM",
    message: "We have space for two produce pickups near Emmett tomorrow afternoon. Reply YES to coordinate.",
  },
  {
    id: "note-2",
    sender: "Treasure Valley Hub",
    timestamp: "Today · 11:04 AM",
    message: "Return-trip compost pickup available after market drop. Palletized scraps only for this load.",
  },
  {
    id: "note-3",
    sender: "Lena Ortiz",
    timestamp: "Yesterday · 4:26 PM",
    message: "Your pickup is confirmed. Driver will call 20 minutes before arrival at the farm gate.",
  },
];

export const hubOperationalStats = [
  {
    label: "Nearby growers",
    value: "48",
    detail: "Eligible contacts along active route corridors.",
  },
  {
    label: "Pickup requests",
    value: "17",
    detail: "Open farmer responses waiting for dispatch review.",
  },
  {
    label: "Active trips",
    value: "6",
    detail: "Live or upcoming deliveries visible to the operations team.",
  },
];

export const routePlans: RoutePlan[] = [
  {
    id: "route-1",
    title: "North Valley Return Loop",
    startLocation: "Boise Distribution Hub",
    endLocation: "Emmett Farm Corridor",
    startTime: "2026-04-21 05:45",
    endTime: "2026-04-21 16:30",
    notes: "Outbound school delivery with return compost collection and two produce pickups.",
    status: "In Transit",
    nearbyFarmers: 18,
    pickupRequests: 6,
    stops: ["Boise Distribution Hub", "School kitchen drop", "Emmett farm cluster", "Compost return dock"],
  },
  {
    id: "route-2",
    title: "Canyon Market Connector",
    startLocation: "Nampa Cold Storage",
    endLocation: "Caldwell Saturday Market",
    startTime: "2026-04-22 06:20",
    endTime: "2026-04-22 14:10",
    notes: "Morning market route with produce staging and an afternoon compost backhaul leg.",
    status: "Open",
    nearbyFarmers: 22,
    pickupRequests: 8,
    stops: ["Nampa Cold Storage", "Caldwell pickup lane", "Saturday Market", "Compost aggregation stop"],
  },
  {
    id: "route-3",
    title: "South Loop School Supply Run",
    startLocation: "Twin Falls Hub",
    endLocation: "Jerome School District",
    startTime: "2026-04-23 05:50",
    endTime: "2026-04-23 13:40",
    notes: "Draft route prepared for school produce delivery with optional farm pickups on return.",
    status: "Draft",
    nearbyFarmers: 9,
    pickupRequests: 3,
    stops: ["Twin Falls Hub", "Jerome schools", "Farm pickup lane", "Return compost bay"],
  },
];

export const routeScenarios: RouteScenario[] = [
  {
    id: "scenario-1",
    title: "Albuquerque Northbound Farm Run",
    origin: "Albuquerque International Sunport, Albuquerque, NM",
    destination: "Santa Fe Plaza, Santa Fe, NM",
    pickups: [
      "Sandia Resort and Casino, Albuquerque, NM",
      "Santa Ana Star Casino Hotel, Bernalillo, NM",
      "Buffalo Thunder Resort and Casino, Santa Fe, NM",
    ],
    notes: "Sample New Mexico route from Albuquerque to Santa Fe with common waypoint landmarks along I-25.",
    fallbackStops: [
      {
        id: "origin",
        label: "S",
        title: "Albuquerque International Sunport, Albuquerque, NM",
        kind: "origin",
        position: { lat: 35.0402, lng: -106.609 },
      },
      {
        id: "pickup-1",
        label: "1",
        title: "Sandia Resort and Casino, Albuquerque, NM",
        kind: "pickup",
        position: { lat: 35.1963, lng: -106.5332 },
      },
      {
        id: "pickup-2",
        label: "2",
        title: "Santa Ana Star Casino Hotel, Bernalillo, NM",
        kind: "pickup",
        position: { lat: 35.3082, lng: -106.5486 },
      },
      {
        id: "pickup-3",
        label: "3",
        title: "Buffalo Thunder Resort and Casino, Santa Fe, NM",
        kind: "pickup",
        position: { lat: 35.7544, lng: -106.7003 },
      },
      {
        id: "destination",
        label: "D",
        title: "Santa Fe Plaza, Santa Fe, NM",
        kind: "destination",
        position: { lat: 35.687, lng: -105.9378 },
      },
    ],
  },
  {
    id: "scenario-2",
    title: "South Valley Market Connector",
    origin: "Old Town Plaza, Albuquerque, NM",
    destination: "Isleta Amphitheater, Albuquerque, NM",
    pickups: [
      "ABQ BioPark Zoo, Albuquerque, NM",
      "National Hispanic Cultural Center, Albuquerque, NM",
    ],
    notes: "Short urban New Mexico sample route with two pickup points between origin and destination.",
    fallbackStops: [
      {
        id: "origin",
        label: "S",
        title: "Old Town Plaza, Albuquerque, NM",
        kind: "origin",
        position: { lat: 35.0965, lng: -106.6703 },
      },
      {
        id: "pickup-1",
        label: "1",
        title: "ABQ BioPark Zoo, Albuquerque, NM",
        kind: "pickup",
        position: { lat: 35.0803, lng: -106.6719 },
      },
      {
        id: "pickup-2",
        label: "2",
        title: "National Hispanic Cultural Center, Albuquerque, NM",
        kind: "pickup",
        position: { lat: 35.0784, lng: -106.6568 },
      },
      {
        id: "destination",
        label: "D",
        title: "Isleta Amphitheater, Albuquerque, NM",
        kind: "destination",
        position: { lat: 34.9763, lng: -106.7143 },
      },
    ],
  },
];

export const drivers: Driver[] = [
  {
    id: "driver-1",
    firstName: "Elena",
    lastName: "Martinez",
    avatarUrl: "https://i.pravatar.cc/120?img=32",
    vehicle: "Box Truck 12",
    phone: "(505) 555-0142",
    zone: "Albuquerque North",
  },
  {
    id: "driver-2",
    firstName: "Marcus",
    lastName: "Reed",
    avatarUrl: "https://i.pravatar.cc/120?img=15",
    vehicle: "Sprinter Van 7",
    phone: "(505) 555-0189",
    zone: "Bernalillo Corridor",
  },
  {
    id: "driver-3",
    firstName: "Priya",
    lastName: "Shah",
    avatarUrl: "https://i.pravatar.cc/120?img=47",
    vehicle: "Flatbed 4",
    phone: "(505) 555-0107",
    zone: "Santa Fe Delivery Loop",
  },
];

export const driverRouteAssignments: DriverRouteAssignment[] = [
  {
    id: "assignment-1",
    driverId: "driver-1",
    routeTitle: "Downtown Organics Run",
    pickupSource: "Mesa Verde Bistro",
    destination: "Sunrise Family Farm",
    pickupWindow: "Today · 9:30 AM - 11:00 AM",
    material: "14 bins of sorted restaurant organics",
    notes: "Check bin lids, confirm no plastic contamination, and upload arrival photo.",
    status: "Started",
  },
  {
    id: "assignment-2",
    driverId: "driver-1",
    routeTitle: "North Market Collection",
    pickupSource: "Harvest Square Market",
    destination: "Rio Grande Growers",
    pickupWindow: "Today · 1:00 PM - 3:30 PM",
    material: "11 bins of produce waste for fertilizer processing",
    notes: "Farmer requested delivery confirmation after processing handoff.",
    status: "Waiting",
  },
  {
    id: "assignment-3",
    driverId: "driver-2",
    routeTitle: "Midtown Prepared Food Loop",
    pickupSource: "Green Bowl Kitchen",
    destination: "Valley Soil Cooperative",
    pickupWindow: "Today · 12:15 PM - 2:00 PM",
    material: "8 bins ready for pickup and sorting",
    notes: "Capture a photo of the sealed bins before leaving the site.",
    status: "In Progress",
  },
  {
    id: "assignment-4",
    driverId: "driver-3",
    routeTitle: "Santa Fe Fertilizer Delivery",
    pickupSource: "Buffalo Thunder Processing Yard",
    destination: "Santa Fe Greenhouse Network",
    pickupWindow: "Tomorrow · 8:00 AM - 10:00 AM",
    material: "2 pallets of finished fertilizer",
    notes: "Unload at the east gate and submit final quality check photos.",
    status: "Completed",
  },
];
