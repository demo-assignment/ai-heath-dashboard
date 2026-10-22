import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verifySession } from "../services/auth.service.js";

export const SESSION_COOKIE = "hearty_session";

export type AuthEnv = { Variables: { user: { id: string; username: string; name: string } } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  c.header("Cache-Control", "no-store");
  const user = verifySession(getCookie(c, SESSION_COOKIE));
  if (!user) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Your session expired. Please sign in again.", retryable: false } },
      401,
    );
  }
  c.set("user", user);
  await next();
});

// CORS alone doesn't prevent another site from submitting a credentialed form.
export const checkRequestOrigin = createMiddleware(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  const origin = c.req.header("Origin");
  const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map(value => value.trim());
  const ownOrigin = new URL(c.req.url).origin;
  if (origin && origin !== ownOrigin && !allowed.includes(origin)) {
    return c.json(
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "This request origin is not allowed.", retryable: false } },
      403,
    );
  }
  await next();
});
