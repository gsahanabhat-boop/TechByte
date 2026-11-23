/** Visitors who chose "Continue as guest" skip the login-first screen on this browser. */
export const GUEST_KEY = "tripsync:guest";

export function isGuest(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuest(on: boolean) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage unavailable: the login screen simply shows again */
  }
}

/** The home page sends a visitor to the login screen only once we know they are signed out and not a guest. */
export function shouldShowLoginFirst(s: { loading: boolean; signedIn: boolean; guest: boolean }) {
  return !s.loading && !s.signedIn && !s.guest;
}
