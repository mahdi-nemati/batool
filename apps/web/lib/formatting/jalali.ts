const jalaliDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" });
const jalaliDateTime = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" });

export function formatJalaliDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : jalaliDate.format(d);
}

export function formatJalaliDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : jalaliDateTime.format(d);
}
