// Persian (fa-IR) number formatting for display. Browsers have full ICU.
const faInt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faDecimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 8 });

export function formatToman(value: number): string {
  return faInt.format(value);
}

export function formatTomanUnit(value: number): string {
  return `${faInt.format(value)} تومان`;
}

export function formatQuantity(value: string | number): string {
  return faDecimal.format(typeof value === "number" ? value : Number(value));
}
