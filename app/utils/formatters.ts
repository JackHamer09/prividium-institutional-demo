import { type Address, formatUnits } from "viem";
import { format, formatDistanceToNow } from "date-fns";

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number, maxDecimals = 6): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) {return "0";}

  // For very small numbers, show more decimals
  if (num < 0.000001) {
    return num.toExponential(2);
  }

  // For normal numbers, limit decimals
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format address to short form (0x1234...5678)
 */
export function formatAddress(address: Address, startChars = 6, endChars = 4): string {
  if (!address) {return "";}
  if (address.length < startChars + endChars) {return address;}

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format basis points to percentage
 */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Format timestamp to human readable date
 */
export function formatDate(timestamp: number): string {
  return format(new Date(timestamp * 1000), "MMM d, yyyy HH:mm");
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

/**
 * Format countdown timer (HH:MM:SS or MM:SS)
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) {return "00:00";}

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
