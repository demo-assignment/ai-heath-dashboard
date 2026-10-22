import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../index.js";
import { createSession, sessionDuration, verifyCredentials, verifySession } from "../services/auth.service.js";

const login = (body: unknown = { username: "user", password: "123456" }, headers: Record<string, string> = {}) =>
  app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const sessionCookie = async () => {
  const response = await login();
  assert.equal(response.status, 200);
  return response.headers.get("Set-Cookie")!.split(";")[0];
};

test("salted scrypt verifies the demo password, not wrong credentials", async () => {
  assert.equal(await verifyCredentials("user", "123456"), true);
  assert.equal(await verifyCredentials("user", "wrong"), false);
  assert.equal(await verifyCredentials("other", "123456"), false);
});

test("session signature rejects tampering and expiry", () => {
  const now = Date.now();
  const token = createSession(now);
  assert.equal(verifySession(token, now)?.username, "user");
  assert.equal(verifySession(token, now + sessionDuration * 1000), null);
  const [payload, signature] = token.split(".");
  const edited = Buffer.from(JSON.stringify({ sub: "admin", exp: 9999999999 })).toString("base64url");
  assert.equal(verifySession(`${edited}.${signature}`), null);
  assert.equal(verifySession(`${payload}.broken`), null);
  assert.equal(verifySession(undefined), null);
  assert.equal(verifySession("invalid.token.extra"), null);
});

test("login returns public user and an HttpOnly cookie, never a hash", async () => {
  const response = await login();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { user: { id: "demo-user", username: "user", name: "Long Phan" } });
  const cookie = response.headers.get("Set-Cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Path=\/api/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("invalid and unknown credentials have the same public error", async () => {
  const wrong = await login({ username: "user", password: "bad" });
  const missing = await login({ username: "nobody", password: "123456" });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.deepEqual(await wrong.json(), await missing.json());
});

test("login rejects malformed and oversized input", async () => {
  for (const body of [
    null,
    {},
    { username: "user", password: 123456 },
    { username: "user", password: "x".repeat(257) },
  ]) {
    const response = await login(body, { "x-forwarded-for": "validation-test" });
    assert.equal(response.status, 400);
  }
});

test("private API routes reject unauthenticated callers", async () => {
  for (const [url, method] of [
    ["/api/health/dashboard", "GET"],
    ["/api/health/entries", "POST"],
    ["/api/health/import", "POST"],
    ["/api/health/profile", "PUT"],
    ["/api/health/entries", "DELETE"],
    ["/api/chat", "POST"],
  ]) {
    const response = await app.request(url, { method });
    assert.equal(response.status, 401, url);
  }
});

test("me and dashboard accept a valid signed cookie", async () => {
  const cookie = await sessionCookie();
  const headers = { Cookie: cookie };
  assert.equal((await app.request("/api/auth/me", { headers })).status, 200);
  const response = await app.request("/api/health/dashboard", { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.persona.id, "long-phan");
});

test("expired or malformed cookies are unauthorized", async () => {
  for (const token of ["fake", createSession(Date.now() - (sessionDuration + 1) * 1000)]) {
    const response = await app.request("/api/auth/me", { headers: { Cookie: `hearty_session=${token}` } });
    assert.equal(response.status, 401);
  }
});

test("logout clears the same cookie path", async () => {
  const response = await app.request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: await sessionCookie() },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie")!, /Max-Age=0/);
  assert.match(response.headers.get("Set-Cookie")!, /Path=\/api/);
});

test("cross-origin writes are blocked and allowed origins get credentialed CORS", async () => {
  const denied = await login(undefined, { Origin: "https://evil.example" });
  assert.equal(denied.status, 403);
  const allowed = await app.request("/api/auth/me", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
  assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), "true");
});

test("login attempts are limited independently", async () => {
  let response: Response | undefined;
  for (let i = 0; i < 11; i++) response = await login({}, { "x-forwarded-for": "limited-test" });
  assert.equal(response!.status, 429);
  assert.ok(response!.headers.get("Retry-After"));
});

test("production requires a strong session secret and uses Secure SameSite=None", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.SESSION_SECRET;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    const unavailable = await login(undefined, { "x-forwarded-for": "production-test" });
    assert.equal(unavailable.status, 503);
    process.env.SESSION_SECRET = "a-test-only-secret-that-has-more-than-32-characters";
    const response = await login(undefined, { "x-forwarded-for": "production-test" });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Set-Cookie")!, /Secure/);
    assert.match(response.headers.get("Set-Cookie")!, /SameSite=None/);
  } finally {
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});
