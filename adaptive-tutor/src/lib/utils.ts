import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a JSON string field from the database.
 * Returns the fallback value on any parse error.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Stringify data for storage in a JSON string field.
 */
export function toJson(data: unknown): string {
  return JSON.stringify(data);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a proficiency color class based on the proficiency score.
 */
export function proficiencyColor(proficiency: number, confidence: number): string {
  if (confidence < 0.1) return "gray";   // untested
  if (proficiency >= 0.8) return "green"; // mastered
  if (proficiency >= 0.4) return "yellow"; // developing
  return "red";                            // gap
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
