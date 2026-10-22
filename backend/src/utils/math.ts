export const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const average = (values: (number | null)[], digits = 1) => {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (!numbers.length) return null;
  return round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length, digits);
};

export const sum = (values: (number | null)[]) => {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
};

export const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
