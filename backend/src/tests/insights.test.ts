import { test } from "node:test";
import assert from "node:assert/strict";
import { getDashboard } from "../services/insights.service.js";
import { getSampleData } from "../data/sampleData.js";

const dashboard = getDashboard(getSampleData());

test("groups 56 days into 8 weeks", () => {
  assert.equal(dashboard.weekly.length, 8);
});

test("skips days without data in averages", () => {
  const weekWithGap = dashboard.weekly.find(week => week.daysTracked < 7);
  assert.ok(weekWithGap);
  assert.ok(weekWithGap!.avgSteps !== null && weekWithGap!.avgSteps > 0);
});

test("lists missing days", () => {
  assert.deepEqual(dashboard.missingDays, ["2026-09-12", "2026-10-03"]);
});

test("returns at most 3 focus areas, worst first", () => {
  assert.ok(dashboard.focusAreas.length <= 3);
  const progress = dashboard.focusAreas.map(
    area => dashboard.goalProgress.find(goal => goal.key === area.key)!.progress,
  );
  assert.deepEqual(
    progress,
    [...progress].sort((a, b) => a - b),
  );
});
