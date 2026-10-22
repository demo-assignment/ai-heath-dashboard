const numberFormat = new Intl.NumberFormat("en-US");

export const formatNumber = (value: number | null | undefined, digits = 0) => {
  if (value === null || value === undefined) return "–";
  return digits ? value.toFixed(digits) : numberFormat.format(Math.round(value));
};

export const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
};

export const formatWeekday = (date: string) => formatDate(date, { weekday: "short" });

export const formatChange = (value: number | null, digits = 0) => {
  if (value === null) return null;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${formatNumber(Math.abs(value), digits)}`;
};

export const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};
