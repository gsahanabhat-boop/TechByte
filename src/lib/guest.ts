/**
 * "Continue as guest" lasts only for the current visit: it is kept in memory,
 * so every fresh load of the site shows the login screen again to signed-out visitors.
 */
let guestThisVisit = false;

export function isGuest(): boolean {
  return guestThisVisit;
}

export function setGuest(on: boolean) {
  guestThisVisit = on;
}

/** The home page sends a visitor to the login screen only once we know they are signed out and not a guest. */
export function shouldShowLoginFirst(s: { loading: boolean; signedIn: boolean; guest: boolean }) {
  return !s.loading && !s.signedIn && !s.guest;
}
