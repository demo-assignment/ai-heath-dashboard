import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import dashboardReducer, { fetchDashboard } from "../src/modules/dashboard/dashboardSlice";
import { loadDashboard, saveDashboard } from "../src/utils/dashboardCache";
import type { Dashboard } from "../src/types/health";

// Simple in-memory localStorage for Node.
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
});

const dashboard = { persona: { name: "Long Phan" }, daily: [{ date: "2026-10-18" }] } as unknown as Dashboard;
const makeStore = () => configureStore({ reducer: { dashboard: dashboardReducer } });

beforeEach(() => memory.clear());

test("saves and loads the last dashboard", () => {
  saveDashboard(dashboard);
  assert.equal(loadDashboard()?.data.persona.name, "Long Phan");
});

test("ignores broken or old data in storage", () => {
  memory.set("hearty:dashboard:v1", "{not json");
  assert.equal(loadDashboard(), null);
  memory.set("hearty:dashboard:v1", JSON.stringify({ savedAt: "x", data: { something: "else" } }));
  assert.equal(loadDashboard(), null);
});

test("when the API is down, shows the saved copy and marks it offline", async () => {
  saveDashboard(dashboard);
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  const store = makeStore();
  await store.dispatch(fetchDashboard());
  const state = store.getState().dashboard;
  assert.equal(state.status, "succeeded");
  assert.equal(state.isOffline, true);
  assert.equal(state.data?.persona.name, "Long Phan");
  assert.ok(state.savedAt);
});

test("when the API is down and nothing is saved, shows the error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  const store = makeStore();
  await store.dispatch(fetchDashboard());
  const state = store.getState().dashboard;
  assert.equal(state.status, "failed");
  assert.match(state.errorMessage, /Can't reach the server/);
});

test("fresh data from the API clears the offline flag", async () => {
  saveDashboard(dashboard);
  globalThis.fetch = async () =>
    new Response(JSON.stringify(dashboard), { status: 200, headers: { "Content-Type": "application/json" } });
  const store = makeStore();
  await store.dispatch(fetchDashboard());
  assert.equal(store.getState().dashboard.isOffline, false);
});
