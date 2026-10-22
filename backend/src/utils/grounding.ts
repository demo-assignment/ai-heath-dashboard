const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g;

const toNumber = (raw: string) => Number(raw.replace(/,/g, ""));

const extractNumbers = (text: string) => (text.match(NUMBER_PATTERN) || []).map(raw => ({ raw, value: toNumber(raw) }));

// Small whole numbers are usually counts or list numbers ("2 workouts", "1."), so we don't check them.
const isTooSmallToCheck = (value: number) => Number.isInteger(value) && value <= 10;

// Returns numbers in the answer that don't appear anywhere in the data we gave the model.
// It's a cheap safety net, not proof: a matched number can still be used in the wrong place.
export const findUnverifiedNumbers = (answer: string, context: string) => {
  const known = new Set(extractNumbers(context).map(item => item.value));
  const unverified = new Set<string>();

  for (const { raw, value } of extractNumbers(answer)) {
    if (Number.isNaN(value) || isTooSmallToCheck(value)) continue;
    if (!known.has(value)) unverified.add(raw);
  }

  return [...unverified].slice(0, 5);
};
