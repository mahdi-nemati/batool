// Server-side Persian (Jalali-locale) number formatting for generated
// financial descriptions. Node ships full ICU, so Intl "fa-IR" produces
// Persian digits and the Persian thousands separator (٬).
const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faDecimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 8 });

export function formatTomanFa(amount: number | bigint): string {
  return faInteger.format(typeof amount === "bigint" ? Number(amount) : amount);
}

export function formatQuantityFa(value: string | number): string {
  return faDecimal.format(typeof value === "number" ? value : Number(value));
}
