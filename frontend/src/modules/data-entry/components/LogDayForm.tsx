import { toast } from "@/utils/toast";
import { FC, FormEvent, useEffect, useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import { dashboardUpdated } from "@/modules/dashboard/dashboardSlice";
import { addEntry } from "@/services/entry.service";
import { ApiError } from "@/api/client";
import WillRender from "@/components/will-render/WillRender";
import { ENTRY_FIELDS, MetricKey } from "../constants/entryFields.const";
import { formatDate } from "@/utils/format";
import type { Dashboard } from "@/types/health";

interface LogDayFormProps {
  dashboard: Dashboard;
}

type Values = Record<MetricKey, string>;

const emptyValues = () => Object.fromEntries(ENTRY_FIELDS.map(field => [field.key, ""])) as Values;

const LogDayForm: FC<LogDayFormProps> = props => {
  const { dashboard } = props;
  const dispatch = useAppDispatch();
  const { entryWindow, lastSyncedDate, manualDates } = dashboard;

  const [date, setDate] = useState(entryWindow.to);
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = manualDates.includes(date);

  // Editing a day you added before: start from what was saved.
  useEffect(() => {
    const existing = isEditing ? dashboard.daily.find(day => day.date === date) : undefined;
    setValues(
      existing
        ? (Object.fromEntries(ENTRY_FIELDS.map(field => [field.key, existing[field.key]?.toString() ?? ""])) as Values)
        : emptyValues(),
    );
    setErrors({});
  }, [date, isEditing, dashboard.daily]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSavedMessage("");

    const entry: Record<string, string | number | null> = { date };
    ENTRY_FIELDS.forEach(field => {
      entry[field.key] = values[field.key] === "" ? null : Number(values[field.key]);
    });

    if (ENTRY_FIELDS.every(field => entry[field.key] === null)) {
      setFormError("Add at least one value for this day.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await addEntry(entry as { date: string });
      dispatch(dashboardUpdated(result.dashboard));
      setErrors({});
      setSavedMessage(
        `${result.updated ? "Updated" : "Saved"} ${formatDate(result.saved)}. Your dashboard and Hearty now use it.`,
      );
      toast.success(`${result.updated ? "Updated" : "Saved"} ${formatDate(result.saved)}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(
          Object.fromEntries(
            error.details.filter(detail => detail.field).map(detail => [detail.field!, detail.message]),
          ),
        );
        setFormError(error.message);
        toast.error(error.message);
      } else {
        setFormError("Couldn't save this day. Please try again.");
        toast.error("Couldn't save this day. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="entry-date" className="text-sm font-semibold">
          Day
        </label>
        <input
          id="entry-date"
          type="date"
          value={date}
          min={entryWindow.from}
          max={entryWindow.to}
          onChange={event => setDate(event.target.value)}
          className="mt-1 block w-full cursor-pointer rounded-2xl border border-line bg-white py-2.5 pl-4 pr-3 text-sm outline-none focus:border-brand"
        />
        <p className={`mt-1 text-xs ${errors.date ? "font-semibold text-rose-600" : "text-muted"}`}>
          {errors.date ||
            `Days up to ${formatDate(lastSyncedDate)} come from your device and are final. You can add ${formatDate(entryWindow.from)} to today.`}
        </p>
        <WillRender when={isEditing}>
          <p className="mt-1 text-xs font-semibold text-brand">You already added this day. Saving will replace it.</p>
        </WillRender>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ENTRY_FIELDS.map(field => (
          <div key={field.key}>
            <label htmlFor={`entry-${field.key}`} className="text-xs font-semibold text-muted">
              {field.label}
            </label>
            <div
              className={`mt-1 flex items-center rounded-2xl border bg-white pr-3 focus-within:border-brand ${errors[field.key] ? "border-rose-400" : "border-line"}`}
            >
              <input
                id={`entry-${field.key}`}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={event => setValues(prev => ({ ...prev, [field.key]: event.target.value }))}
                placeholder="–"
                className="w-full min-w-0 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="text-xs text-muted">{field.unit}</span>
            </div>
            <WillRender when={!!errors[field.key]}>
              <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors[field.key]}</p>
            </WillRender>
          </div>
        ))}
      </div>

      <WillRender when={!!formError}>
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {formError}
        </p>
      </WillRender>
      <WillRender when={!!savedMessage}>
        <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {savedMessage}
        </p>
      </WillRender>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
      >
        {isSaving ? "Saving…" : isEditing ? "Update this day" : "Save this day"}
      </button>
    </form>
  );
};

export default LogDayForm;
