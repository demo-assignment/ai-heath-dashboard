import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEntryDate, validateEntry } from "../utils/validateEntry.js";
import { getEntryStore } from "../data/entryStore.js";
import { getHealthData } from "../data/index.js";
import { getDashboard } from "../services/insights.service.js";

test("accepts a valid day and rounds decimals", () => {
  const result = validateEntry({ date: "2026-10-20", steps: 8000, sleepHours: 7.25 });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.record.sleepHours, 7.3);
    assert.equal(result.record.proteinG, null);
  }
});

test("rejects wrong types, ranges and fake dates", () => {
  const result = validateEntry({ date: "2026-02-30", steps: "9000", restingHeartRate: 300, activeMinutes: 10.5 });
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.deepEqual(
      result.errors.map(error => error.field),
      ["date", "steps", "activeMinutes", "restingHeartRate"],
    );
});

test("needs at least one value", () => {
  assert.equal(validateEntry({ date: "2026-10-20" }).ok, false);
});

test("only days after the last sync and up to today are allowed", () => {
  const window = { from: "2026-10-19", to: "2026-10-21" };
  assert.equal(checkEntryDate("2026-10-18", window), "past");
  assert.equal(checkEntryDate("2026-10-20", window), "ok");
  assert.equal(checkEntryDate("2026-10-22", window), "future");
});

test("a new day after a gap adds empty days in between and shows up in the dashboard", async () => {
  const store = getEntryStore("long-phan");
  await store.clear();
  await store.upsertMany([
    {
      date: "2026-10-21",
      steps: 9000,
      activeMinutes: 60,
      sleepHours: 7,
      restingHeartRate: 66,
      caloriesIn: 1900,
      proteinG: 85,
      waterL: 2,
      weightKg: null,
    },
  ]);

  const data = await getHealthData();
  const lastDays = data.daily.slice(-3);
  assert.deepEqual(
    lastDays.map(day => day.date),
    ["2026-10-19", "2026-10-20", "2026-10-21"],
  );
  assert.equal(lastDays[0].steps, null);
  assert.equal(lastDays[2].steps, 9000);

  const dashboard = getDashboard(data);
  assert.deepEqual(dashboard.manualDates, ["2026-10-21"]);
  assert.equal(dashboard.weekly.length, 9);
  assert.ok(dashboard.weekly[8].isPartial);
  await store.clear();
});
