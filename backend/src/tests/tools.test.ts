import { test } from "node:test";
import assert from "node:assert/strict";
import { executeTool } from "../services/tools.service.js";
import { getSampleData } from "../data/sampleData.js";

const data = getSampleData();
const run = (name: string, args: unknown) =>
  executeTool({ id: "1", name, arguments: JSON.stringify(args) }, data).content;

test("returns daily data for a range", () => {
  const result = run("get_daily_metrics", { from: "2026-10-05", to: "2026-10-07" }) as { days: unknown[] };
  assert.equal(result.days.length, 3);
});

test("marks days without sync instead of returning nulls", () => {
  const result = run("get_daily_metrics", { from: "2026-10-03", to: "2026-10-03" }) as { days: { note?: string }[] };
  assert.equal(result.days[0].note, "no data synced");
});

test("returns an error for dates outside the data", () => {
  const result = run("get_daily_metrics", { from: "2025-01-01", to: "2025-01-02" });
  assert.match(String(result.error), /only available/);
});

test("rejects ranges longer than 31 days for daily data", () => {
  const result = run("get_daily_metrics", { from: "2026-08-24", to: "2026-10-18" });
  assert.match(String(result.error), /too long/);
});

test("rejects bad date formats and invalid JSON", () => {
  assert.ok(run("get_period_summary", { from: "Oct 3", to: "Oct 9" }).error);
  assert.ok(executeTool({ id: "1", name: "get_daily_metrics", arguments: "{oops" }, data).content.error);
});

test("summary is calculated in code", () => {
  const result = run("get_period_summary", { from: "2026-10-12", to: "2026-10-18" }) as {
    avgSteps: number;
    daysTracked: number;
  };
  const lastWeek = data.daily.slice(-7);
  const expected = Math.round(lastWeek.reduce((total, day) => total + (day.steps ?? 0), 0) / lastWeek.length);
  assert.equal(result.daysTracked, 7);
  assert.equal(result.avgSteps, expected);
});

test("filters workouts by type", () => {
  const result = run("get_workouts", { from: "2026-08-24", to: "2026-10-18", type: "Yoga" }) as {
    workouts: { type: string }[];
  };
  assert.ok(result.workouts.length > 0);
  assert.ok(result.workouts.every(workout => workout.type === "Yoga"));
});

test("unknown tools return an error", () => {
  assert.match(String(run("delete_everything", {}).error), /Unknown tool/);
});

test("show_chart returns a chart built from the data, with the goal", () => {
  const result = executeTool(
    {
      id: "1",
      name: "show_chart",
      arguments: JSON.stringify({ metric: "sleepHours", from: "2026-10-12", to: "2026-10-18" }),
    },
    data,
  );
  assert.equal(result.chart?.points.length, 7);
  assert.equal(result.chart?.goal, 7.5);
  assert.deepEqual(
    result.chart?.points.map(point => point.value),
    data.daily.slice(-7).map(day => day.sleepHours),
  );
});

test("show_chart rejects unknown metrics", () => {
  const result = executeTool(
    {
      id: "1",
      name: "show_chart",
      arguments: JSON.stringify({ metric: "bloodPressure", from: "2026-10-12", to: "2026-10-18" }),
    },
    data,
  );
  assert.equal(result.chart, undefined);
  assert.ok(result.content.error);
});

test("show_chart and daily data return goal flags computed in code", async () => {
  const { getHealthData } = await import("../data/index.js");
  const data = await getHealthData();
  const chart = executeTool(
    {
      id: "c1",
      name: "show_chart",
      arguments: JSON.stringify({ metric: "sleepHours", from: "2026-10-12", to: "2026-10-18" }),
    },
    data,
  );
  const content = chart.content as {
    goalMetCount: number;
    goalMetOn: string[];
    points: { date: string; goalMet?: boolean }[];
  };
  assert.equal(content.goalMetCount, 1);
  assert.deepEqual(content.goalMetOn, ["2026-10-17"]);
  assert.equal(content.points.find(point => point.date === "2026-10-18")?.goalMet, false);

  const daily = executeTool(
    { id: "d1", name: "get_daily_metrics", arguments: JSON.stringify({ from: "2026-10-18", to: "2026-10-18" }) },
    data,
  );
  assert.equal((daily.content as { days: { sleepGoalMet: boolean }[] }).days[0].sleepGoalMet, false);
});
