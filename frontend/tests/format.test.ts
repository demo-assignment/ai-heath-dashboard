import { test } from "node:test";
import assert from "node:assert/strict";
import { formatChange, formatDate, formatNumber, isWeekend } from "../src/utils/format";

test("formats numbers and missing values", () => {
  assert.equal(formatNumber(7492), "7,492");
  assert.equal(formatNumber(6.04, 1), "6.0");
  assert.equal(formatNumber(null), "–");
});

test("formats changes with a sign", () => {
  assert.equal(formatChange(1058), "+1,058");
  assert.equal(formatChange(-0.6, 1), "−0.6");
  assert.equal(formatChange(0), "±0");
  assert.equal(formatChange(null), null);
});

test("dates don't shift with the browser time zone", () => {
  assert.equal(formatDate("2026-10-18"), "18 Oct");
  assert.equal(isWeekend("2026-10-18"), true);
  assert.equal(isWeekend("2026-10-19"), false);
});
