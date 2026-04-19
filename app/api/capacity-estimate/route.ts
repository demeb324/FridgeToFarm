import { NextResponse } from "next/server";

import { estimateLoadCapacity } from "@backend/services/load-capacity";
import type { CapacityEstimateRole } from "@/lib/types";

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const maxFileSizeBytes = 8 * 1024 * 1024;

function parseDimension(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isRole(value: string): value is CapacityEstimateRole {
  return value === "distributor" || value === "farmer";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const roleValue = formData.get("role");
  const image = formData.get("image");
  const notesEntry = formData.get("notes");

  if (typeof roleValue !== "string" || !isRole(roleValue)) {
    return NextResponse.json({ error: "role must be either distributor or farmer." }, { status: 400 });
  }

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }

  if (!allowedMimeTypes.has(image.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  if (image.size > maxFileSizeBytes) {
    return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
  }

  const bedLength = parseDimension(formData.get("bedLength"));
  const bedWidth = parseDimension(formData.get("bedWidth"));
  const bedHeight = parseDimension(formData.get("bedHeight"));

  if (
    !Number.isFinite(bedLength) ||
    !Number.isFinite(bedWidth) ||
    !Number.isFinite(bedHeight) ||
    bedLength <= 0 ||
    bedWidth <= 0 ||
    bedHeight <= 0
  ) {
    return NextResponse.json(
      { error: "bedLength, bedWidth, and bedHeight must be positive numbers." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const imageDataUrl = `data:${image.type};base64,${buffer.toString("base64")}`;

    const estimate = await estimateLoadCapacity({
      imageDataUrl,
      role: roleValue,
      bedLength,
      bedWidth,
      bedHeight,
      notes: typeof notesEntry === "string" ? notesEntry : "",
    });

    return NextResponse.json(estimate);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to estimate load capacity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
