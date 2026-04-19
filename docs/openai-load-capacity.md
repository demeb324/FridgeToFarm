# OpenAI Load Capacity Estimator

This feature lets distributors and farmers upload a photo of a load and get an approximate space-usage estimate for a truck bed, trailer bed, or similar cargo area.

## How it works

- The UI uploads one image to [route.ts](C:/Users/Demetrius%20Billey/desertdev/FridgeToFarm/app/api/capacity-estimate/route.ts).
- The backend converts the image into a data URL and sends it to the OpenAI Responses API.
- The model returns a structured estimate that includes:
  - estimated fill percentage
  - floor coverage percentage
  - height usage percentage
  - estimated used and remaining cubic volume
  - confidence, assumptions, and safety notes

## Required environment variables

Add these to `.env.local`:

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_VISION_MODEL=gpt-5.4-mini
```

`OPENAI_VISION_MODEL` is optional. If omitted, the app defaults to `gpt-5.4-mini`.

## Product note

This estimator is intentionally approximate. OpenAI's current vision docs note that image-based counting and physical judgments can be approximate, and image resizing can affect analysis.

Official sources:

- [Images and vision](https://platform.openai.com/docs/guides/images-vision)
- [Responses API](https://platform.openai.com/docs/api-reference/responses/compact?api-mode=responses)
- [Structured outputs](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas)

## Current UI locations

- [Hub dashboard](C:/Users/Demetrius%20Billey/desertdev/FridgeToFarm/components/hub-dashboard-shell.tsx)
- [Farmer page](C:/Users/Demetrius%20Billey/desertdev/FridgeToFarm/app/farmer/page.tsx)

## Important limitation

The model can estimate occupied share of a known cargo space, but it cannot reliably determine exact real-world dimensions from a single image alone. Accuracy improves when:

- the full load is visible
- part of the bed or trailer frame is visible
- the image is well lit
- the user provides correct bed dimensions
