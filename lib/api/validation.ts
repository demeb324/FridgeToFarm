export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

export function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function isLatitude(value: number) {
  return value >= -90 && value <= 90;
}

export function isLongitude(value: number) {
  return value >= -180 && value <= 180;
}

export function isIsoDateTime(value: string) {
  return !Number.isNaN(Date.parse(value));
}
