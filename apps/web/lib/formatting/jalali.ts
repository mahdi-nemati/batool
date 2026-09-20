const jalaliDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" });
const jalaliDateTime = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" });
const jalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const jalaliMonthName = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "long",
});

function normalizeDigits(value: string): string {
  return [...value]
    .map((char) => {
      const fa = "۰۱۲۳۴۵۶۷۸۹".indexOf(char);
      if (fa >= 0) return String(fa);
      const ar = "٠١٢٣٤٥٦٧٨٩".indexOf(char);
      return ar >= 0 ? String(ar) : char;
    })
    .join("");
}

export function gregorianDateToJalaliInput(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    jalaliParts.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}/${parts.month}/${parts.day}`;
}

export function jalaliInputToGregorian(value: string): string | null {
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(normalizeDigits(value));
  if (match === null) return null;
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) return null;
  const target = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const estimate = Date.UTC(Number(year) + 621, 2, 21);
  for (let offset = -370; offset <= 370; offset += 1) {
    const date = new Date(estimate + offset * 86400000);
    const parts = Object.fromEntries(
      jalaliParts.formatToParts(date).map((part) => [part.type, part.value]),
    );
    if (`${parts.year}-${parts.month}-${parts.day}` === target) {
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
}

export function jalaliMonthLabel(year: number, month: number): string {
  const gregorian = jalaliInputToGregorian(`${year}/${month}/1`);
  return gregorian === null
    ? `${year}/${month}`
    : jalaliMonthName.format(new Date(`${gregorian}T12:00:00Z`));
}

export function jalaliMonthDays(year: number, month: number): number {
  for (let day = 31; day >= 1; day -= 1) {
    if (jalaliInputToGregorian(`${year}/${month}/${day}`) !== null) return day;
  }
  return 30;
}

export function formatJalaliDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : jalaliDate.format(d);
}

export function formatJalaliDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : jalaliDateTime.format(d);
}
