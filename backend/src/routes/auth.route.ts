import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE } from "../middlewares/auth.js";
import {
  createSession,
  isProduction,
  publicUser,
  sessionDuration,
  verifyCredentials,
  verifySession,
} from "../services/auth.service.js";

export const authRoute = new Hono();
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? ("None" as const) : ("Lax" as const),
  path: "/api",
});

// Like the other demo limiter, this is per instance rather than a distributed lockout.
authRoute.post("/login", async c => {
  c.header("Cache-Control", "no-store");
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
  const now = Date.now();
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  const bucket = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (bucket.count >= 10) {
    c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return c.json(
      {
        error: {
          code: "LOGIN_RATE_LIMITED",
          message: "Too many sign-in attempts. Try again in a few minutes.",
          retryable: true,
        },
      },
      429,
    );
  }
  bucket.count += 1;
  attempts.set(ip, bucket);

  const body = await c.req.json().catch(() => null);
  if (
    typeof body?.username !== "string" ||
    typeof body?.password !== "string" ||
    !body.username.trim() ||
    !body.password ||
    body.username.length > 100 ||
    body.password.length > 256
  ) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "Enter a username and password.", retryable: false } },
      400,
    );
  }
  if (!(await verifyCredentials(body.username.trim(), body.password))) {
    return c.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Incorrect username or password.", retryable: false } },
      401,
    );
  }
  let session: string;
  try {
    session = createSession();
  } catch {
    return c.json(
      {
        error: { code: "AUTH_NOT_CONFIGURED", message: "Sign-in is not configured on this server.", retryable: false },
      },
      503,
    );
  }
  setCookie(c, SESSION_COOKIE, session, { ...cookieOptions(), maxAge: sessionDuration });
  return c.json({ user: publicUser() });
});

authRoute.get("/me", c => {
  c.header("Cache-Control", "no-store");
  const user = verifySession(getCookie(c, SESSION_COOKIE));
  if (!user)
    return c.json({ error: { code: "UNAUTHORIZED", message: "Please sign in to continue.", retryable: false } }, 401);
  return c.json({ user });
});

authRoute.post("/logout", c => {
  c.header("Cache-Control", "no-store");
  deleteCookie(c, SESSION_COOKIE, cookieOptions());
  return c.json({ ok: true });
});
