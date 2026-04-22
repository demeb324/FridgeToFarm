import { NextResponse } from "next/server";
import { publishRoute } from "@/lib/services/publish-route";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const result = await publishRoute(id);

  if (!result.ok) {
    switch (result.error.kind) {
      case "not_found":
        return NextResponse.json({ error: "Route not found." }, { status: 404 });
      case "already_published":
        return NextResponse.json({ error: "Route already published." }, { status: 409 });
      case "proximity_failed":
        return NextResponse.json({ error: "Proximity matching failed." }, { status: 500 });
      case "update_failed":
        return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    route: result.value.route,
    farmers_notified: result.value.farmers_notified,
    notifications: result.value.notifications,
  });
}
