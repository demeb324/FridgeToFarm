import OpenAI from "openai";

import { getOpenAiApiKey, getOpenAiVisionModel } from "@/lib/env";
import type { CapacityEstimateResult, CapacityEstimateRole } from "@/lib/types";

type EstimateCapacityParams = {
  imageDataUrl: string;
  role: CapacityEstimateRole;
  bedLength: number;
  bedWidth: number;
  bedHeight: number;
  notes?: string;
};

type ModelCapacityEstimate = {
  summary: string;
  estimated_fill_percentage: number;
  estimated_floor_coverage_percentage: number;
  estimated_height_usage_percentage: number;
  fit_status: "fits_comfortably" | "fits_tightly" | "likely_over_capacity" | "unclear";
  confidence: "low" | "medium" | "high";
  visible_cues: string[];
  assumptions: string[];
  safety_notes: string[];
};

const capacityEstimateSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "estimated_fill_percentage",
    "estimated_floor_coverage_percentage",
    "estimated_height_usage_percentage",
    "fit_status",
    "confidence",
    "visible_cues",
    "assumptions",
    "safety_notes",
  ],
  properties: {
    summary: { type: "string" },
    estimated_fill_percentage: { type: "number" },
    estimated_floor_coverage_percentage: { type: "number" },
    estimated_height_usage_percentage: { type: "number" },
    fit_status: {
      type: "string",
      enum: ["fits_comfortably", "fits_tightly", "likely_over_capacity", "unclear"],
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    visible_cues: {
      type: "array",
      items: { type: "string" },
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    safety_notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const systemPrompt = `
You estimate how much of a transportation bed or cargo space is occupied by a visible load in an image.

Be conservative and honest:
- This is an approximation only.
- If the photo angle, crop, or missing reference objects reduce certainty, lower confidence and say so.
- Never claim exact dimensions from the image alone.
- Use the supplied bed dimensions as the total available space.
- Focus on occupied share of the available bed volume, not the weight of the material.
- Return JSON that matches the schema exactly.
`.trim();

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(value.toFixed(1))));
}

export async function estimateLoadCapacity({
  imageDataUrl,
  role,
  bedLength,
  bedWidth,
  bedHeight,
  notes,
}: EstimateCapacityParams): Promise<CapacityEstimateResult> {
  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const totalVolume = bedLength * bedWidth * bedHeight;

  const userPrompt = `
Estimate how much of this ${role === "distributor" ? "distribution vehicle" : "farm transport"} cargo space is occupied.

Available cargo space dimensions in feet:
- length: ${bedLength}
- width: ${bedWidth}
- max usable height: ${bedHeight}
- total cubic feet: ${Number(totalVolume.toFixed(2))}

Additional context from the user:
${notes?.trim() ? notes.trim() : "No extra notes provided."}

Return:
- a concise summary
- estimated_fill_percentage as a number from 0 to 100
- estimated_floor_coverage_percentage as a number from 0 to 100
- estimated_height_usage_percentage as a number from 0 to 100
- fit_status
- confidence
- visible_cues
- assumptions
- safety_notes
`.trim();

  const response = await openai.responses.create({
    model: getOpenAiVisionModel(),
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: userPrompt },
          { type: "input_image", image_url: imageDataUrl, detail: "auto" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "capacity_estimate",
        strict: true,
        schema: capacityEstimateSchema,
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as ModelCapacityEstimate;
  const estimatedFillPercentage = clampPercentage(parsed.estimated_fill_percentage);
  const estimatedUsedVolume = Number(((estimatedFillPercentage / 100) * totalVolume).toFixed(2));
  const estimatedRemainingVolume = Number(Math.max(0, totalVolume - estimatedUsedVolume).toFixed(2));

  return {
    summary: parsed.summary,
    estimatedFillPercentage,
    estimatedFloorCoveragePercentage: clampPercentage(parsed.estimated_floor_coverage_percentage),
    estimatedHeightUsagePercentage: clampPercentage(parsed.estimated_height_usage_percentage),
    estimatedUsedVolume,
    estimatedRemainingVolume,
    fitStatus: parsed.fit_status,
    confidence: parsed.confidence,
    visibleCues: parsed.visible_cues,
    assumptions: parsed.assumptions,
    safetyNotes: parsed.safety_notes,
  };
}
