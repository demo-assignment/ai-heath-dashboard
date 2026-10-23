import { toast } from "@/utils/toast";
import { FC, FormEvent, useEffect, useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import Mascot from "@/components/mascot/Mascot";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import WillRender from "@/components/will-render/WillRender";
import { CloseIcon } from "@/components/icons/Icons";
import Select from "@/components/select/Select";
import { dashboardUpdated } from "@/modules/dashboard/dashboardSlice";
import { updateProfile } from "@/services/entry.service";
import { ApiError } from "@/api/client";
import type { Dashboard } from "@/types/health";

interface ProfileModalProps {
  dashboard: Dashboard;
  onClose: () => void;
}

type Field = {
  key: string;
  label: string;
  group: "persona" | "goals";
  type: "text" | "number";
  unit?: string;
  step?: number;
};

const ABOUT_FIELDS: Field[] = [
  { key: "name", label: "Name", group: "persona", type: "text" },
  { key: "age", label: "Age", group: "persona", type: "number" },
  { key: "heightCm", label: "Height", group: "persona", type: "number", unit: "cm" },
  { key: "occupation", label: "Occupation", group: "persona", type: "text" },
  { key: "dietPreference", label: "Diet", group: "persona", type: "text" },
];

const GOAL_FIELDS: Field[] = [
  { key: "dailySteps", label: "Steps a day", group: "goals", type: "number", unit: "steps" },
  { key: "weeklyActiveMinutes", label: "Active minutes a week", group: "goals", type: "number", unit: "min" },
  { key: "sleepHours", label: "Sleep a night", group: "goals", type: "number", unit: "h", step: 0.1 },
  { key: "dailyProteinG", label: "Protein a day", group: "goals", type: "number", unit: "g" },
  { key: "dailyWaterL", label: "Water a day", group: "goals", type: "number", unit: "L", step: 0.1 },
  { key: "targetWeightKg", label: "Target weight", group: "goals", type: "number", unit: "kg", step: 0.1 },
];

const ProfileModal: FC<ProfileModalProps> = props => {
  const { dashboard, onClose } = props;
  const dispatch = useAppDispatch();
  useLockBodyScroll();
  const { persona, goals } = dashboard;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const source: Record<string, unknown> = { ...persona, ...goals };
    return Object.fromEntries(
      [...ABOUT_FIELDS, ...GOAL_FIELDS].map(field => [field.key, String(source[field.key] ?? "")]),
    );
  });
  const [sex, setSex] = useState(persona.sex);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toValue = (field: Field) =>
    field.type === "number" ? (values[field.key] === "" ? null : Number(values[field.key])) : values[field.key];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setIsSaving(true);

    const profile = {
      persona: { ...Object.fromEntries(ABOUT_FIELDS.map(field => [field.key, toValue(field)])), sex },
      goals: Object.fromEntries(GOAL_FIELDS.map(field => [field.key, toValue(field)])),
    };

    try {
      const result = await updateProfile(profile as never);
      dispatch(dashboardUpdated(result.dashboard));
      toast.success("Profile saved. Your dashboard and Hearty now use it.");
      onClose();
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
        setFormError("Couldn't save your profile. Please try again.");
        toast.error("Couldn't save your profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: Field) => (
    <div key={field.key} className={field.key === "name" ? "col-span-2" : ""}>
      <label htmlFor={`profile-${field.key}`} className="text-xs font-semibold text-muted">
        {field.label}
      </label>
      <div
        className={`mt-1 flex items-center rounded-2xl border bg-white pr-3 focus-within:border-brand ${errors[field.key] ? "border-rose-400" : "border-line"}`}
      >
        <input
          id={`profile-${field.key}`}
          type={field.type}
          inputMode={field.type === "number" ? "decimal" : undefined}
          step={field.step ?? 1}
          maxLength={field.type === "text" ? 60 : undefined}
          value={values[field.key]}
          onChange={event => setValues(prev => ({ ...prev, [field.key]: event.target.value }))}
          className="w-full min-w-0 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none"
        />
        {field.unit && <span className="text-xs text-muted">{field.unit}</span>}
      </div>
      <WillRender when={!!errors[field.key]}>
        <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors[field.key]}</p>
      </WillRender>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
        onClick={event => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:max-w-xl sm:rounded-[32px]"
      >
        <header className="flex items-center gap-3 px-5 pt-5 sm:px-6">
          <Mascot mood="happy" size={48} />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">Your profile</h2>
            <p className="text-xs text-muted">Your dashboard and Hearty use these details and goals.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-canvas">
            <CloseIcon />
          </button>
        </header>

        <form
          id="profile-form"
          onSubmit={submit}
          noValidate
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">About you</legend>
            <div className="grid grid-cols-2 gap-3">
              {ABOUT_FIELDS.slice(0, 1).map(renderField)}
              {ABOUT_FIELDS.slice(1, 3).map(renderField)}
              <div>
                <label htmlFor="profile-sex" className="text-xs font-semibold text-muted">
                  Sex
                </label>
                <Select
                  id="profile-sex"
                  value={sex}
                  onChange={setSex}
                  className="mt-1"
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              {ABOUT_FIELDS.slice(3).map(renderField)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Your goals</legend>
            <div className="grid grid-cols-2 gap-3">{GOAL_FIELDS.map(renderField)}</div>
            <p className="mt-2 text-xs text-muted">
              Start weight {goals.startWeightKg} kg and goal date stay the same, because they come from your recorded
              data.
            </p>
          </fieldset>

          <WillRender when={!!formError}>
            <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {formError}
            </p>
          </WillRender>
        </form>

        {/* Outside the scroll area so the action is always visible; form="profile-form" keeps Enter-to-submit working. */}
        <footer className="shrink-0 border-t border-line bg-white px-5 py-3 sm:px-6">
          <button
            type="submit"
            form="profile-form"
            disabled={isSaving}
            className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save profile"}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ProfileModal;
