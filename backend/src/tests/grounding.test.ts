import { test } from "node:test";
import assert from "node:assert/strict";
import { findUnverifiedNumbers } from "../utils/grounding.js";

const context = "avg steps 7492, goal 8000, sleep 6.0 h, weight 62.6 kg, 2026-10-18";

test("accepts numbers that exist in the data", () => {
  assert.deepEqual(findUnverifiedNumbers("You walked 7,492 steps vs 8,000 and weigh 62.6 kg.", context), []);
});

test("flags numbers that are not in the data", () => {
  assert.deepEqual(findUnverifiedNumbers("Your steps went up 37% to 9,100.", context), ["37", "9,100"]);
});

test("ignores small counts and list numbers", () => {
  assert.deepEqual(findUnverifiedNumbers("1. You did 3 workouts in 2 days.", context), []);
});

test("numbers from the user's question count as known", () => {
  const withQuestion = `${context}\nCan I reach 9500 steps?`;
  assert.deepEqual(findUnverifiedNumbers("To reach 9,500 steps, add a short walk.", withQuestion), []);
});
