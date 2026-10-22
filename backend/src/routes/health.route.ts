import { Hono } from "hono";
import { getHealthData } from "../data/index.js";
import { getEntryStore } from "../data/entryStore.js";
import { getDashboard } from "../services/insights.service.js";
import { parseHealthWorkbook } from "../services/import.service.js";
import { checkEntryDate, validateEntry } from "../utils/validateEntry.js";
import { validateProfile } from "../utils/validateProfile.js";
import { rateLimit } from "../middlewares/rateLimit.js";

export const healthRoute = new Hono();

const MAX_FILE_BYTES = 1024 * 1024;
// The demo is public, so cap how many days can be added by hand.
const MAX_MANUAL_DAYS = 120;

const loadDashboard = async () => getDashboard(await getHealthData());

healthRoute.get("/dashboard", async c => {
  return c.json(await loadDashboard());
});

// Log one day from the form.
healthRoute.post("/entries", rateLimit, async c => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "Send the day as a JSON object.", retryable: false } },
      400,
    );
  }

  const result = validateEntry(body as Record<string, unknown>);
  if (!result.ok) {
    return c.json(
      {
        error: {
          code: "INVALID_ENTRY",
          message: "Please fix the highlighted fields.",
          retryable: false,
          details: result.errors,
        },
      },
      422,
    );
  }

  const dashboard = await loadDashboard();
  const dateCheck = checkEntryDate(result.record.date, dashboard.entryWindow);
  if (dateCheck !== "ok") {
    const message =
      dateCheck === "past"
        ? `Days up to ${dashboard.lastSyncedDate} already come from your device and can't be changed.`
        : "You can't log a day in the future.";
    return c.json(
      { error: { code: "DATE_NOT_ALLOWED", message, retryable: false, details: [{ field: "date", message }] } },
      422,
    );
  }

  const isNewDay = !dashboard.manualDates.includes(result.record.date);
  if (isNewDay && dashboard.manualDates.length >= MAX_MANUAL_DAYS) {
    return c.json(
      {
        error: {
          code: "LIMIT_REACHED",
          message: "This demo already has the maximum number of added days.",
          retryable: false,
        },
      },
      422,
    );
  }

  await getEntryStore(dashboard.persona.id).upsertMany([result.record]);
  return c.json({ saved: result.record.date, updated: !isNewDay, dashboard: await loadDashboard() }, 201);
});

// Same checks as the import, but nothing is saved: the UI shows the file row by row first.
healthRoute.post("/import/preview", rateLimit, async c => {
  const body = await c.req.parseBody().catch(() => null);
  const file = body?.file;
  if (!(file instanceof File))
    return c.json({ error: { code: "NO_FILE", message: "Choose an .xlsx file to upload.", retryable: false } }, 400);
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    return c.json(
      { error: { code: "WRONG_FILE_TYPE", message: "Only .xlsx files are accepted.", retryable: false } },
      422,
    );
  if (file.size > MAX_FILE_BYTES)
    return c.json(
      { error: { code: "FILE_TOO_LARGE", message: "The file must be smaller than 1 MB.", retryable: false } },
      422,
    );

  const dashboard = await loadDashboard();
  const result = await parseHealthWorkbook(await file.arrayBuffer(), dashboard.entryWindow);
  return c.json(
    result.ok
      ? { ok: true, rows: result.rows, newDays: result.records.length, skipped: result.skipped.length, issues: [] }
      : { ok: false, message: result.message, rows: result.rows, newDays: 0, skipped: 0, issues: result.issues },
  );
});

// Import many days from an .xlsx file. All or nothing.
healthRoute.post("/import", rateLimit, async c => {
  const body = await c.req.parseBody().catch(() => null);
  const file = body?.file;

  if (!(file instanceof File)) {
    return c.json({ error: { code: "NO_FILE", message: "Choose an .xlsx file to upload.", retryable: false } }, 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return c.json(
      { error: { code: "WRONG_FILE_TYPE", message: "Only .xlsx files are accepted.", retryable: false } },
      422,
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return c.json(
      { error: { code: "FILE_TOO_LARGE", message: "The file must be smaller than 1 MB.", retryable: false } },
      422,
    );
  }

  const dashboard = await loadDashboard();
  const result = await parseHealthWorkbook(await file.arrayBuffer(), dashboard.entryWindow);

  if (!result.ok) {
    return c.json(
      { error: { code: "INVALID_FILE", message: result.message, retryable: false, details: result.issues } },
      422,
    );
  }

  const newDays = result.records.filter(record => !dashboard.manualDates.includes(record.date)).length;
  if (dashboard.manualDates.length + newDays > MAX_MANUAL_DAYS) {
    return c.json(
      { error: { code: "LIMIT_REACHED", message: "This would add more days than the demo allows.", retryable: false } },
      422,
    );
  }

  await getEntryStore(dashboard.persona.id).upsertMany(result.records);
  return c.json({
    imported: result.records.map(record => record.date),
    skipped: result.skipped,
    dashboard: await loadDashboard(),
  });
});

// Edit the profile and goals. Everything (dashboard, goal progress, Hearty's prompt) uses it right away.
healthRoute.put("/profile", rateLimit, async c => {
  const body = await c.req.json().catch(() => null);
  const result = validateProfile(body);
  if (!result.ok) {
    return c.json(
      {
        error: {
          code: "INVALID_PROFILE",
          message: "Please fix the highlighted fields.",
          retryable: false,
          details: result.errors,
        },
      },
      422,
    );
  }

  const dashboard = await loadDashboard();
  // This plan is about losing weight from the recorded start weight, so the target must be below it.
  if (result.profile.goals.targetWeightKg >= dashboard.goals.startWeightKg) {
    const message = `Target weight must be below your start weight (${dashboard.goals.startWeightKg} kg).`;
    return c.json(
      {
        error: { code: "INVALID_PROFILE", message, retryable: false, details: [{ field: "targetWeightKg", message }] },
      },
      422,
    );
  }
  await getEntryStore(dashboard.persona.id).setProfile(result.profile);
  return c.json({ dashboard: await loadDashboard() });
});

// Remove added days and the edited profile, and go back to the sample data.
healthRoute.delete("/entries", rateLimit, async c => {
  const dashboard = await loadDashboard();
  await getEntryStore(dashboard.persona.id).clear();
  return c.json({ dashboard: await loadDashboard() });
});
