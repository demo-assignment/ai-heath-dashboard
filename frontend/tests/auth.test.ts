import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ApiError, invalidateSessionRequests, request } from "../src/api/client";
import { getCurrentUser, login, logout } from "../src/services/auth.service";
import { configureStore } from "@reduxjs/toolkit";
import dashboardReducer, { dashboardCleared, fetchDashboard } from "../src/modules/dashboard/dashboardSlice";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const user = { id: "demo-user", username: "user", name: "Long Phan" };

test("login sends credentials by cookie, not a browser-side password hash", async () => {
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /\/auth\/login$/);
    assert.equal(init?.credentials, "include");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { username: "user", password: "123456" });
    return Response.json({ user });
  };
  assert.deepEqual((await login("user", "123456")).user, user);
});

test("session check and logout include credentials", async () => {
  const methods: string[] = [];
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.credentials, "include");
    methods.push(init?.method || "GET");
    return Response.json({ user, ok: true });
  };
  await getCurrentUser();
  await logout();
  assert.deepEqual(methods, ["GET", "POST"]);
});

test("wrong password stays an ApiError with 401", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Incorrect username or password.", retryable: false } },
      { status: 401 },
    );
  await assert.rejects(
    login("user", "wrong"),
    (error: unknown) => error instanceof ApiError && error.status === 401 && error.code === "INVALID_CREDENTIALS",
  );
});

test("late JSON responses are rejected after the session changes", async () => {
  let finish!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise(resolve => {
      finish = resolve;
    });
  const pending = request("/health/dashboard");
  invalidateSessionRequests();
  finish(Response.json({ secret: "old data" }));
  await assert.rejects(pending, (error: unknown) => error instanceof ApiError && error.code === "STALE_REQUEST");
});

test("logout clears Redux and ignores an older pending dashboard", async () => {
  let finish!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise(resolve => {
      finish = resolve;
    });
  const store = configureStore({ reducer: { dashboard: dashboardReducer } });
  const pending = store.dispatch(fetchDashboard());
  store.dispatch(dashboardCleared());
  finish(Response.json({ persona: { name: "Long Phan" }, daily: [] }));
  await pending;
  assert.equal(store.getState().dashboard.data, null);
  assert.equal(store.getState().dashboard.status, "idle");
});
