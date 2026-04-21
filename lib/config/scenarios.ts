// lib/config/scenarios.ts
import type { RouteScenario } from "@/lib/types";

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
    fertilizerPoints: [
      {
        id: "fert-1",
        label: "F1",
        title: "La Montanita Co-op Compost Hub, Albuquerque, NM",
        position: { lat: 35.1192, lng: -106.6087 },
      },
      {
        id: "fert-2",
        label: "F2",
        title: "Bernalillo Soil Amendment Yard, Bernalillo, NM",
        position: { lat: 35.3168, lng: -106.5511 },
      },
      {
        id: "fert-3",
        label: "F3",
        title: "Santa Fe Fertility Drop, Santa Fe, NM",
        position: { lat: 35.7068, lng: -105.9935 },
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
    fertilizerPoints: [
      {
        id: "fert-4",
        label: "F1",
        title: "South Valley Compost Transfer, Albuquerque, NM",
        position: { lat: 35.0409, lng: -106.6782 },
      },
      {
        id: "fert-5",
        label: "F2",
        title: "Rio Bravo Farm Input Depot, Albuquerque, NM",
        position: { lat: 35.0111, lng: -106.6752 },
      },
    ],
  },
];
