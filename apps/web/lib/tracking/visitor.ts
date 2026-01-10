/**
 * Visitor tracking utility for frontend
 * Manages visitor ID (df_vid) in cookies and localStorage
 */

const VISITOR_ID_KEY = 'df_vid';
const VISITOR_ID_LENGTH = 32;
const COOKIE_MAX_AGE_DAYS = 365; // 1 year

/**
 * Generate a random visitor ID
 */
function generateVisitorId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < VISITOR_ID_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get visitor ID from cookie
 */
function getVisitorIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === VISITOR_ID_KEY) {
      return value;
    }
  }
  return null;
}

/**
 * Get visitor ID from localStorage
 */
function getVisitorIdFromStorage(): string | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    return localStorage.getItem(VISITOR_ID_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Set visitor ID in cookie
 */
function setVisitorIdInCookie(visitorId: string): void {
  if (typeof document === 'undefined') return;

  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60; // seconds
  document.cookie = `${VISITOR_ID_KEY}=${visitorId}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Set visitor ID in localStorage
 */
function setVisitorIdInStorage(visitorId: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  } catch (error) {
    // Ignore localStorage errors
  }
}

/**
 * Get or create visitor ID
 * Priority: cookie > localStorage > generate new
 */
export function getOrCreateVisitorId(): string {
  // Try cookie first
  let visitorId = getVisitorIdFromCookie();
  if (visitorId) {
    // Sync to localStorage if missing
    if (!getVisitorIdFromStorage()) {
      setVisitorIdInStorage(visitorId);
    }
    return visitorId;
  }

  // Try localStorage
  visitorId = getVisitorIdFromStorage();
  if (visitorId) {
    // Sync to cookie if missing
    setVisitorIdInCookie(visitorId);
    return visitorId;
  }

  // Generate new
  visitorId = generateVisitorId();
  setVisitorIdInCookie(visitorId);
  setVisitorIdInStorage(visitorId);

  return visitorId;
}

/**
 * Get current visitor ID (without creating)
 */
export function getVisitorId(): string | null {
  return getVisitorIdFromCookie() || getVisitorIdFromStorage();
}
