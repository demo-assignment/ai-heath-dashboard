import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseHealthWorkbook } from "../services/import.service.js";

const window = { from: "2026-10-19", to: "2026-10-21" };
const fixture = async (name: string) => {
  const buffer = await readFile(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

test("imports valid rows and skips days that are already final", async () => {
  const result = await parseHealthWorkbook(await fixture("sample-valid.xlsx"), window);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(
    result.records.map(record => record.date),
    ["2026-10-19", "2026-10-20", "2026-10-21"],
  );
  assert.deepEqual(
    result.skipped.map(row => row.date),
    ["2026-10-15"],
  );
  assert.equal(result.records[1].weightKg, null);
});

test("rejects the whole file when any row is wrong", async () => {
  const result = await parseHealthWorkbook(await fixture("sample-invalid.xlsx"), window);
  assert.equal(result.ok, false);
  if (result.ok) return;
  const problems = result.issues.map(issue => `${issue.row}:${issue.column}`);
  assert.deepEqual(problems, ["2:steps", "3:date", "4:sleep_hours", "5:date"]);
});

test("rejects a file whose columns don't match the template", async () => {
  const result = await parseHealthWorkbook(await fixture("wrong-header.xlsx"), window);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /columns/);
});

test("rejects something that is not a spreadsheet", async () => {
  const result = await parseHealthWorkbook(new TextEncoder().encode("hello").buffer as ArrayBuffer, window);
  assert.equal(result.ok, false);
});

test("builds a row-by-row preview with a status for each row", async () => {
  const valid = await parseHealthWorkbook(await fixture("sample-valid.xlsx"), window);
  assert.deepEqual(
    valid.rows.map(row => `${row.row}:${row.status}`),
    ["2:skipped", "3:new", "4:new", "5:new"],
  );
  assert.equal(valid.rows[1].values.steps, valid.ok ? valid.records[0].steps : null);

  const invalid = await parseHealthWorkbook(await fixture("sample-invalid.xlsx"), window);
  assert.ok(invalid.rows.every(row => row.status === "error"));
  assert.match(invalid.rows[0].message || "", /Steps must be a number/);
});

test("empty cells stay empty in the preview", async () => {
  const valid = await parseHealthWorkbook(await fixture("sample-valid.xlsx"), window);
  assert.equal(valid.rows[2].values.weight_kg, null);
});
