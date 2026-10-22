import assert from "node:assert/strict";

// Import emitted JavaScript with plain Node, not tsx or a bundler.
process.env.LLM_MOCK = "true";
process.env.SESSION_SECRET ||= "runtime-smoke-test-only-not-a-production-secret";
const { default: app } = await import("../dist/index.js");
const call = (url, method = "GET", body, cookie = "") =>
  app.request(url, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

assert.equal((await call("/api")).status, 200);
assert.equal((await call("/api/health/dashboard")).status, 401);
const login = await call("/api/auth/login", "POST", { username: "user", password: "123456" });
assert.equal(login.status, 200);
const cookie = login.headers.get("Set-Cookie")?.split(";")[0];
assert.ok(cookie);
const dashboard = await call("/api/health/dashboard", "GET", undefined, cookie);
assert.equal(dashboard.status, 200);
assert.equal((await dashboard.json()).persona.id, "long-phan");
const created = await call("/api/conversations", "POST", {}, cookie);
assert.equal(created.status, 201);
const { conversation } = await created.json();
const chat = await call(
  "/api/chat",
  "POST",
  { conversationId: conversation.id, message: "How did I sleep on 3 Oct?" },
  cookie,
);
assert.equal(chat.status, 200);
assert.match(await chat.text(), /event: done/);
const saved = await call(`/api/conversations/${conversation.id}`, "GET", undefined, cookie);
assert.equal((await saved.json()).conversation.messages.length, 2);
assert.equal((await call(`/api/conversations/${conversation.id}`, "DELETE", undefined, cookie)).status, 200);
console.log("Native Node ESM smoke passed: entrypoint, JSON data, auth, dashboard, conversations and chat.");
