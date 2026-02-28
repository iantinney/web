/**
 * Client-side authentication utilities using localStorage
 * No passwords; username-based identification only
 */

const USER_ID_KEY = "currentUserId";
const DISPLAY_NAME_KEY = "currentUserDisplayName";
const DEFAULT_USER_ID = "demo-user";

/**
 * Get current user ID (from localStorage or fallback)
 * Safe to call on client only
 */
export function getUserId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_USER_ID;
  }
  try {
    return localStorage.getItem(USER_ID_KEY) || DEFAULT_USER_ID;
  } catch (e) {
    console.warn("Cannot access localStorage:", e);
    return DEFAULT_USER_ID;
  }
}

/**
 * Set the current user ID (save to localStorage)
 */
export function setUserId(userId: string): void {
  if (typeof window === "undefined") {
    console.warn("Cannot set userId on server");
    return;
  }
  try {
    localStorage.setItem(USER_ID_KEY, userId);
  } catch (e) {
    console.error("Cannot save userId to localStorage:", e);
  }
}

/**
 * Clear the user ID (logout)
 */
export function clearUserId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(DISPLAY_NAME_KEY);
  } catch (e) {
    console.error("Cannot clear userId:", e);
  }
}

/**
 * Check if user is authenticated (not using demo-user)
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const userId = localStorage.getItem(USER_ID_KEY);
    return userId !== null && userId !== DEFAULT_USER_ID;
  } catch {
    return false;
  }
}

/**
 * Get the display name for the current user
 */
export function getCurrentUserDisplayName(): string {
  if (typeof window === "undefined") return "Learner";
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || "Learner";
  } catch {
    return "Learner";
  }
}

/**
 * Set the display name for the current user
 */
export function setCurrentUserDisplayName(displayName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  } catch (e) {
    console.error("Cannot save display name:", e);
  }
}
