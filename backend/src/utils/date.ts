export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const isRealDate = (date: string) => {
  if (!DATE_PATTERN.test(date)) return false;
  const value = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
};

// "Today" in the app's time zone, so a Vietnamese user can log today's data before 7am too.
export const getToday = () => {
  const timeZone = process?.env?.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
};
