import { readSheet } from "read-excel-file/universal";
import { ENTRY_FIELDS, checkEntryDate, validateEntry } from "../utils/validateEntry.js";
import type { DailyRecord } from "../types/health.js";

// The file must use exactly these columns, in this order. Anything else is rejected.
export const IMPORT_COLUMNS = [
  "date",
  "steps",
  "active_minutes",
  "sleep_hours",
  "resting_heart_rate",
  "calories_in",
  "protein_g",
  "water_l",
  "weight_kg",
] as const;

const MAX_ROWS = 100;

export interface ImportIssue {
  row?: number;
  column?: string;
  message: string;
}

export interface SkippedRow {
  row: number;
  date: string;
  reason: string;
}

// One line per data row, so the UI can show the file before anything is saved.
export interface PreviewRow {
  row: number;
  date: string | null;
  values: Record<string, number | string | null>;
  status: "new" | "skipped" | "error";
  message?: string;
}

type ImportResult =
  | { ok: true; records: DailyRecord[]; skipped: SkippedRow[]; rows: PreviewRow[] }
  | { ok: false; message: string; issues: ImportIssue[]; rows: PreviewRow[] };

const COLUMN_FOR_FIELD: Record<string, string> = Object.fromEntries(
  ENTRY_FIELDS.map((field, index) => [field.key, IMPORT_COLUMNS[index + 1]]),
);

// Excel stores typed dates as real dates. read-excel-file gives them back as Date objects in UTC.
const toDateString = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  return value;
};

const isEmptyRow = (row: unknown[]) => row.every(cell => cell === null || cell === undefined || cell === "");

export const parseHealthWorkbook = async (
  file: ArrayBuffer,
  window: { from: string; to: string },
): Promise<ImportResult> => {
  let rows: unknown[][];
  try {
    rows = (await readSheet(file)) as unknown[][];
  } catch {
    return { ok: false, message: "This file can't be read as an .xlsx spreadsheet.", issues: [], rows: [] };
  }

  const header = (rows[0] || []).map(cell => (typeof cell === "string" ? cell.trim() : cell));
  const headerMatches =
    header.length === IMPORT_COLUMNS.length && IMPORT_COLUMNS.every((column, index) => header[index] === column);

  if (!headerMatches) {
    return {
      ok: false,
      message: "The columns don't match the template.",
      issues: [{ row: 1, message: `Row 1 must be exactly: ${IMPORT_COLUMNS.join(", ")}` }],
      rows: [],
    };
  }

  const dataRows = rows
    .slice(1)
    .map((cells, index) => ({ cells, row: index + 2 }))
    .filter(({ cells }) => !isEmptyRow(cells));
  if (!dataRows.length) return { ok: false, message: "The file has no data rows.", issues: [], rows: [] };
  if (dataRows.length > MAX_ROWS) {
    return {
      ok: false,
      message: `The file has ${dataRows.length} rows. The maximum is ${MAX_ROWS}.`,
      issues: [],
      rows: [],
    };
  }

  const issues: ImportIssue[] = [];
  const records: DailyRecord[] = [];
  const skipped: SkippedRow[] = [];
  const seenDates = new Map<string, number>();
  const previewRows: PreviewRow[] = [];
  const toCell = (value: unknown) =>
    value === undefined || value === null || value === ""
      ? null
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : typeof value === "number" || typeof value === "string"
          ? value
          : String(value);

  for (const { cells, row } of dataRows) {
    const issuesBefore = issues.length;
    const skippedBefore = skipped.length;
    const values = Object.fromEntries(
      IMPORT_COLUMNS.slice(1).map((column, index) => [column, toCell(cells[index + 1])]),
    );
    const rawDate = toDateString(cells[0]);
    const addPreview = () => {
      const rowIssues = issues.slice(issuesBefore);
      if (rowIssues.length)
        previewRows.push({
          row,
          date: typeof rawDate === "string" ? rawDate : null,
          values,
          status: "error",
          message: rowIssues.map(issue => issue.message).join(" "),
        });
      else if (skipped.length > skippedBefore)
        previewRows.push({
          row,
          date: rawDate as string,
          values,
          status: "skipped",
          message: skipped[skipped.length - 1].reason,
        });
      else previewRows.push({ row, date: rawDate as string, values, status: "new" });
    };
    if (
      cells.length > IMPORT_COLUMNS.length &&
      cells.slice(IMPORT_COLUMNS.length).some(cell => cell !== null && cell !== "")
    ) {
      issues.push({ row, message: "Has values outside the template columns." });
      addPreview();
      continue;
    }

    const raw: Record<string, unknown> = { date: toDateString(cells[0]) };
    ENTRY_FIELDS.forEach((field, index) => {
      raw[field.key] = cells[index + 1] ?? null;
    });

    const result = validateEntry(raw);
    if (!result.ok) {
      result.errors.forEach(error =>
        issues.push({
          row,
          column: error.field === "date" ? "date" : COLUMN_FOR_FIELD[error.field],
          message: error.message,
        }),
      );
      addPreview();
      continue;
    }

    const { date } = result.record;
    const firstRow = seenDates.get(date);
    if (firstRow) {
      issues.push({ row, column: "date", message: `${date} is already used in row ${firstRow}.` });
      addPreview();
      continue;
    }
    seenDates.set(date, row);

    const dateCheck = checkEntryDate(date, window);
    if (dateCheck === "future") {
      issues.push({ row, column: "date", message: `${date} is in the future.` });
      addPreview();
      continue;
    }
    if (dateCheck === "past") {
      skipped.push({ row, date, reason: "On or before the last device sync, so this day is already final." });
      addPreview();
      continue;
    }

    records.push(result.record);
    addPreview();
  }

  // All or nothing: one bad row rejects the whole file, so the data never ends up half imported.
  if (issues.length)
    return {
      ok: false,
      message: `Found ${issues.length} problem${issues.length > 1 ? "s" : ""} in the file.`,
      issues,
      rows: previewRows,
    };
  return { ok: true, records, skipped, rows: previewRows };
};
