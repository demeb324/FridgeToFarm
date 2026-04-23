/**
 * Deterministic hash-to-HSL. Fixed saturation and lightness so colors stay
 * visually balanced on the map regardless of input id.
 */
export function routeColor(routeId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < routeId.length; i++) {
    hash ^= routeId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}
