import type { TripPlan } from "./types";

const KEY = "tripsync:history:v1";
const MAX = 30;

function read(): TripPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TripPlan[]) : [];
  } catch {
    return [];
  }
}

function write(list: TripPlan[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new Event("tripsync:history"));
}

export const tripHistory = {
  list: read,
  get: (id: string) => read().find((t) => t.id === id),
  has: (id: string) => read().some((t) => t.id === id),
  save(plan: TripPlan) {
    write([plan, ...read().filter((t) => t.id !== plan.id)]);
  },
  remove(id: string) {
    write(read().filter((t) => t.id !== id));
  },
  clear() {
    write([]);
  },
};
