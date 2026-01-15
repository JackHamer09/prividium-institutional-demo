/**
 * Duration time units for input
 */
export const DURATION_UNITS = [
  { label: "Seconds", value: "seconds", multiplier: 1 },
  { label: "Minutes", value: "minutes", multiplier: 60 },
  { label: "Hours", value: "hours", multiplier: 3600 },
  { label: "Days", value: "days", multiplier: 86400 },
  { label: "Months", value: "months", multiplier: 2592000 }, // 30 days
] as const;

export type DurationUnit = typeof DURATION_UNITS[number]["value"];

/**
 * Convert duration value and unit to seconds
 */
export function convertDurationToSeconds(value: number, unit: DurationUnit): number {
  const unitConfig = DURATION_UNITS.find((u) => u.value === unit);
  return value * (unitConfig?.multiplier ?? 3600); // Default to hours
}

/**
 * Offers refresh interval in milliseconds (2 seconds)
 */
export const OFFERS_REFRESH_INTERVAL_MS = 5_000;

/**
 * Balance refresh interval in milliseconds (2 seconds)
 */
export const BALANCE_REFRESH_INTERVAL_MS = 5_000;

/**
 * RPC status check interval in milliseconds (2 seconds)
 */
export const RPC_CHECK_INTERVAL_MS = 5_000;

/**
 * Calculate fee amount from basis points
 */
export function calculateFeeAmount(lendAmount: bigint, feeBps: number): bigint {
  return (lendAmount * BigInt(feeBps)) / BigInt(10000);
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 && parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(" ") || "0s";
}
