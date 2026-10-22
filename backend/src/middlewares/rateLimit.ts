import { createMiddleware } from "hono/factory";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// In-memory and per instance, so it's only a basic guard for the demo's API quota.
// A real deployment would use Redis or the platform's firewall rules.
export const rateLimit = createMiddleware(async (c, next) => {
  const max = Number(process?.env?.RATE_LIMIT_MAX) || 20;
  const windowMs = Number(process?.env?.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000;
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
  const now = Date.now();

  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (bucket.count >= max) {
    c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "You've sent a lot of questions. Please wait a few minutes.",
          retryable: true,
        },
      },
      429,
    );
  }

  bucket.count += 1;
  return next();
});
