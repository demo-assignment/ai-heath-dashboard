/**
 * Creates the Excel template and the two sample files used by the "Upload Excel" tab and the tests.
 *
 * Run from the backend folder:  npm run samples
 */
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import writeXlsxFile from "write-excel-file/node";
import { IMPORT_COLUMNS } from "../src/services/import.service.js";

const PUBLIC = fileURLToPath(new URL("../../frontend/public/samples/", import.meta.url));
const FIXTURES = fileURLToPath(new URL("../src/tests/fixtures/", import.meta.url));

type Cell = string | number | Date | null;

const RULES = [
  ["steps", "steps", "0 to 100000, whole number"],
  ["active_minutes", "minutes", "0 to 1440, whole number"],
  ["sleep_hours", "hours", "0 to 24"],
  ["resting_heart_rate", "bpm", "25 to 220, whole number"],
  ["calories_in", "kcal", "0 to 10000, whole number"],
  ["protein_g", "grams", "0 to 500, whole number"],
  ["water_l", "litres", "0 to 15"],
  ["weight_kg", "kg", "20 to 400"],
];

const GUIDE = [
  "Keep row 1 exactly as it is. The file is rejected if a column is renamed, moved or added.",
  "One row per day. date: YYYY-MM-DD (a typed Excel date also works).",
  "Only days after the last device sync and up to today are added. Older rows are skipped.",
  "Leave a cell empty if you don't know the value. Text in a number column is an error.",
  "One wrong row rejects the whole file, so nothing is half imported.",
];

const day = (date: string) => new Date(`${date}T00:00:00Z`);

const toCell = (value: Cell) => {
  if (value instanceof Date) return { value, type: Date, format: "yyyy-mm-dd" };
  return value;
};

const build = async (rows: Cell[][], name: string) => {
  const header = IMPORT_COLUMNS.map(column => ({
    value: column,
    fontWeight: "bold" as const,
    textColor: "#FFFFFF",
    backgroundColor: "#1F6F5C",
  }));
  const guide = [
    [{ value: "How to fill daily_log", fontWeight: "bold" as const, fontSize: 14 }],
    [null],
    ...GUIDE.map(line => [line]),
    [null],
    ["Column", "Unit", "Allowed values"].map(value => ({ value, fontWeight: "bold" as const })),
    ...RULES,
  ];

  const path = `${PUBLIC}${name}`;
  await writeXlsxFile([
    {
      sheet: "daily_log",
      data: [header, ...rows.map(row => row.map(toCell))],
      columns: IMPORT_COLUMNS.map(() => ({ width: 18 })),
    },
    { sheet: "how_to_fill", data: guide, columns: [{ width: 24 }, { width: 12 }, { width: 34 }] },
  ] as never).toFile(path);
  return path;
};

await mkdir(PUBLIC, { recursive: true });
await mkdir(FIXTURES, { recursive: true });

await build([], "health-log-template.xlsx");

const valid = await build(
  [
    [day("2026-10-15"), 8200, 52, 6.4, 67, 1900, 74, 1.6, null], // before the last sync: skipped
    [day("2026-10-19"), 9100, 64, 7.2, 66, 1950, 82, 1.9, 62.4],
    ["2026-10-20", 7800, 48, 6.8, 67, 2010, 88, 2.1, null], // date typed as text also works
    [day("2026-10-21"), 10400, 71, 7.6, 65, 1880, 91, 2.2, null],
  ],
  "sample-valid.xlsx",
);

const invalid = await build(
  [
    [day("2026-10-19"), "nine thousand", 64, 7.2, 66, 1950, 82, 1.9, null], // text in a number column
    ["20/10/2026", 7800, 48, 6.8, 67, 2010, 88, 2.1, null], // wrong date format
    [day("2026-10-21"), 10400, 71, 30, 65, 1880, 91, 2.2, null], // 30 hours of sleep
    [day("2030-01-01"), 5000, 30, 7, 66, 1800, 70, 1.8, null], // future date
  ],
  "sample-invalid.xlsx",
);

// a file with the columns in the wrong order, for the tests
const wrongHeaderPath = `${FIXTURES}wrong-header.xlsx`;
const swapped = [...IMPORT_COLUMNS];
[swapped[2], swapped[3]] = [swapped[3], swapped[2]];
await writeXlsxFile([swapped, ["2026-10-19", 9000, 7, 60, 66, 1900, 80, 2, null]] as never).toFile(wrongHeaderPath);

await copyFile(valid, `${FIXTURES}sample-valid.xlsx`);
await copyFile(invalid, `${FIXTURES}sample-invalid.xlsx`);
console.log(`Samples written to ${PUBLIC}`);
