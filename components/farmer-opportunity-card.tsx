import type { PickupOpportunity } from "@/lib/types";
import { RouteCard } from "@/components/route-card";

export function FarmerOpportunityCard({ opportunity }: { opportunity: PickupOpportunity }) {
  return <RouteCard route={opportunity} actionLabel="Respond / Coordinate" />;
}
