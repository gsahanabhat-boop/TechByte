import { describe, expect, it } from "vitest";

import { shouldShowLoginFirst } from "@/lib/guest";

describe("login-first entry", () => {
  it("sends a signed-out, non-guest visitor to the login screen", () => {
    expect(shouldShowLoginFirst({ loading: false, signedIn: false, guest: false })).toBe(true);
  });
  it("lets a guest straight into the planner", () => {
    expect(shouldShowLoginFirst({ loading: false, signedIn: false, guest: true })).toBe(false);
  });
  it("lets a signed-in user straight into the planner", () => {
    expect(shouldShowLoginFirst({ loading: false, signedIn: true, guest: false })).toBe(false);
  });
  it("waits while the sign-in state is still loading", () => {
    expect(shouldShowLoginFirst({ loading: true, signedIn: false, guest: false })).toBe(false);
  });
});

describe("guest choice", () => {
  it("lasts for the current visit only", async () => {
    const mod = await import("@/lib/guest");
    expect(mod.isGuest()).toBe(false);
    mod.setGuest(true);
    expect(mod.isGuest()).toBe(true);
  });
});
