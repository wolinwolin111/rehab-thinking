/** 可比较的关节角度输入；原始文本另行保留用于兼容和审计。 */
export type RangeMeasurement = {
  measurementId: string;
  actionId: string;
  side: string;
  valueDeg: number;
  mode: "active" | "passive";
  method: "estimated" | "goniometer" | "other";
  recordedAt: string;
};

export function parseRangeAngle(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const match = raw.trim().replace(/度/g, "°").match(/^([0-9]+(?:\.[0-9]+)?)\s*°?$/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 && value <= 360 ? value : undefined;
}

export function formatRangeAngle(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value}°` : "";
}
