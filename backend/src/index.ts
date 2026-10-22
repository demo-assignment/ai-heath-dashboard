import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health.route.js";
import { chatRoute } from "./routes/chat.route.js";
import { authRoute } from "./routes/auth.route.js";
import { conversationRoute } from "./routes/conversation.route.js";
import { checkRequestOrigin, requireAuth } from "./middlewares/auth.js";

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(origin => origin && origin !== "*");

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.use("/api/*", checkRequestOrigin);
app.use("/api/health/*", requireAuth);
app.use("/api/conversations", requireAuth);
app.use("/api/conversations/*", requireAuth);
app.use("/api/chat", requireAuth);
app.use("/api/chat/*", requireAuth);

app.get("/api", c => c.json({ message: "Health Insight API is running" }));
app.route("/api/auth", authRoute);
app.route("/api/conversations", conversationRoute);
app.route("/api/health", healthRoute);
app.route("/api/chat", chatRoute);

app.notFound(c => c.json({ error: { code: "NOT_FOUND", message: "Route not found.", retryable: false } }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong.", retryable: true } }, 500);
});

// Vercel picks up this default export and runs it as a function.
export default app;
