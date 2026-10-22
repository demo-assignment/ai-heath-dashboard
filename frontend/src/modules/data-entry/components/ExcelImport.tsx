import { ChangeEvent, DragEvent, FC, useRef, useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import { dashboardUpdated } from "@/modules/dashboard/dashboardSlice";
import { importSpreadsheet, ImportPreview, previewSpreadsheet, SkippedRow } from "@/services/entry.service";
import { ApiError, ApiErrorDetail } from "@/api/client";
import WillRender from "@/components/will-render/WillRender";
import { IMPORT_COLUMNS } from "../constants/entryFields.const";
import { formatDate } from "@/utils/format";

type Result =
  | { type: "success"; imported: string[]; skipped: SkippedRow[] }
  | { type: "error"; message: string; details: ApiErrorDetail[] };

const ExcelImport: FC = () => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkRef = useRef(0);

  const pickFile = async (picked?: File | null) => {
    setResult(null);
    setPreview(null);
    setFile(picked || null);
    if (!picked) return;
    const check = ++checkRef.current;
    setIsChecking(true);
    try {
      const response = await previewSpreadsheet(picked);
      if (check === checkRef.current) setPreview(response);
    } catch (error) {
      if (check !== checkRef.current) return;
      setResult({
        type: "error",
        message: error instanceof ApiError ? error.message : "Couldn't read this file.",
        details: error instanceof ApiError ? error.details : [],
      });
    } finally {
      if (check === checkRef.current) setIsChecking(false);
    }
  };

  const clearFile = () => {
    checkRef.current += 1;
    setFile(null);
    setPreview(null);
    setIsChecking(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void pickFile(event.dataTransfer.files?.[0]);
  };

  const upload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    try {
      const response = await importSpreadsheet(file);
      dispatch(dashboardUpdated(response.dashboard));
      setResult({ type: "success", imported: response.imported, skipped: response.skipped });
      clearFile();
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof ApiError ? error.message : "Upload failed. Please try again.",
        details: error instanceof ApiError ? error.details : [],
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-canvas p-4 text-sm">
        <p className="font-semibold">The file must match the template exactly</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            Row 1: <code className="text-[11px] text-ink">{IMPORT_COLUMNS.join(", ")}</code>
          </li>
          <li>One row per day, date as YYYY-MM-DD. Empty cells are fine.</li>
          <li>Rows up to the last device sync are skipped. Future dates are not allowed.</li>
          <li>One wrong row rejects the whole file, so nothing is half imported.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/samples/health-log-template.xlsx"
            download
            className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            Download template
          </a>
          <a
            href="/samples/sample-valid.xlsx"
            download
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold"
          >
            Sample file
          </a>
          <a
            href="/samples/sample-invalid.xlsx"
            download
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold"
          >
            Sample with errors
          </a>
        </div>
      </div>

      <label
        onDragOver={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-8 text-center transition ${isDragging ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand"}`}
      >
        <span className="text-3xl" aria-hidden>
          📄
        </span>
        <span className="mt-2 text-sm font-semibold">
          {file ? file.name : "Drop your .xlsx file here or click to choose"}
        </span>
        <span className="mt-1 text-xs text-muted">
          {file ? `${Math.ceil(file.size / 1024)} KB` : "Max 1 MB, up to 100 days"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void pickFile(event.target.files?.[0])}
        />
      </label>

      <WillRender when={isChecking}>
        <p className="text-center text-xs text-muted">Reading the file…</p>
      </WillRender>

      <WillRender when={!!preview}>{preview && <PreviewTable preview={preview} onCancel={clearFile} />}</WillRender>

      <button
        onClick={upload}
        disabled={!file || isUploading || isChecking || !preview?.ok || !preview.newDays}
        className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-white hover:bg-brand disabled:opacity-50"
      >
        {isUploading
          ? "Importing…"
          : preview?.ok && preview.newDays
            ? `Import ${preview.newDays} day${preview.newDays > 1 ? "s" : ""}`
            : "Import file"}
      </button>

      <WillRender when={result?.type === "success"}>
        {result?.type === "success" && (
          <div role="status" className="space-y-2 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              {result.imported.length
                ? `Imported ${result.imported.length} day${result.imported.length > 1 ? "s" : ""}: ${result.imported.map(date => formatDate(date)).join(", ")}`
                : "No new days to import."}
            </p>
            {result.skipped.length > 0 && (
              <div>
                <p className="text-xs font-semibold">Skipped {result.skipped.length} row(s):</p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.skipped.map(row => (
                    <li key={row.row}>
                      Row {row.row} ({formatDate(row.date)}): {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </WillRender>

      <WillRender when={result?.type === "error"}>
        {result?.type === "error" && (
          <div role="alert" className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">File rejected. {result.message}</p>
            {result.details.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto rounded-2xl bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row</th>
                      <th className="px-3 py-2 font-semibold">Column</th>
                      <th className="px-3 py-2 font-semibold">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((detail, index) => (
                      <tr key={index} className="border-t border-line">
                        <td className="px-3 py-1.5">{detail.row ?? "–"}</td>
                        <td className="px-3 py-1.5 font-mono">{detail.column ?? "–"}</td>
                        <td className="px-3 py-1.5">{detail.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </WillRender>
    </div>
  );
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-emerald-100 text-emerald-800",
  skipped: "bg-slate-100 text-slate-600",
  error: "bg-rose-100 text-rose-700",
};
const STATUS_LABEL: Record<string, string> = { new: "New", skipped: "Skipped", error: "Error" };
const PREVIEW_COLUMNS = [
  { key: "steps", label: "Steps" },
  { key: "active_minutes", label: "Active" },
  { key: "sleep_hours", label: "Sleep" },
  { key: "resting_heart_rate", label: "HR" },
  { key: "calories_in", label: "kcal" },
  { key: "protein_g", label: "Protein" },
  { key: "water_l", label: "Water" },
  { key: "weight_kg", label: "Weight" },
];

interface PreviewTableProps {
  preview: ImportPreview;
  onCancel: () => void;
}

const PreviewTable: FC<PreviewTableProps> = props => {
  const { preview, onCancel } = props;
  const errors = preview.rows.filter(row => row.status === "error").length;

  return (
    <div className="space-y-2 rounded-3xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold">
          Preview · {preview.ok ? `${preview.newDays} new, ${preview.skipped} skipped` : preview.message}
        </p>
        <button onClick={onCancel} className="text-xs font-semibold text-muted hover:text-ink">
          Choose another file
        </button>
      </div>
      {!preview.ok && errors > 0 && (
        <p className="px-1 text-xs text-rose-700">
          Fix the rows marked Error, then upload again. Nothing has been saved.
        </p>
      )}
      {preview.rows.length > 0 && (
        <div className="max-h-60 overflow-auto rounded-2xl border border-line">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="sticky top-0 bg-canvas text-muted">
              <tr>
                <th className="px-2 py-2 font-semibold">Row</th>
                <th className="px-2 py-2 font-semibold">Date</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                {PREVIEW_COLUMNS.map(column => (
                  <th key={column.key} className="px-2 py-2 text-right font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map(row => (
                <tr
                  key={row.row}
                  className={`border-t border-line ${row.status === "skipped" ? "text-muted" : ""}`}
                  title={row.message}
                >
                  <td className="px-2 py-1.5">{row.row}</td>
                  <td className="px-2 py-1.5 font-mono">{row.date ?? "–"}</td>
                  <td className="px-2 py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  {PREVIEW_COLUMNS.map(column => (
                    <td key={column.key} className="px-2 py-1.5 text-right tabular-nums">
                      {row.values[column.key] ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview.rows.some(row => row.message) && (
        <ul className="space-y-0.5 px-1 text-[11px] text-muted">
          {preview.rows
            .filter(row => row.message)
            .map(row => (
              <li key={row.row}>
                Row {row.row}: {row.message}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default ExcelImport;
