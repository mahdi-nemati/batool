"use client";

import { useLayoutEffect, useRef } from "react";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";
const groupedNumber = new Intl.NumberFormat("fa-IR");

const ones = [
  "صفر",
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "شش",
  "هفت",
  "هشت",
  "نه",
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون"];

export function normalizeAmount(value: string): string {
  return [...value]
    .map((char) => {
      const fa = faDigits.indexOf(char);
      if (fa >= 0) return String(fa);
      const ar = arDigits.indexOf(char);
      return ar >= 0 ? String(ar) : char;
    })
    .join("")
    .replace(/[^\d]/g, "");
}

function threeDigitWords(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundred > 0) parts.push(hundreds[hundred] ?? "");
  if (remainder > 0) {
    if (remainder < 20) parts.push(ones[remainder] ?? "");
    else {
      parts.push(tens[Math.floor(remainder / 10)] ?? "");
      if (remainder % 10 > 0) parts.push(ones[remainder % 10] ?? "");
    }
  }
  return parts.filter(Boolean).join(" و ");
}

export function amountInPersianWords(value: string): string {
  const normalized = normalizeAmount(value);
  if (normalized.length === 0) return "";
  let remaining = BigInt(normalized);
  if (remaining === 0n) return "صفر تومان";

  const parts: string[] = [];
  let group = 0;
  while (remaining > 0n) {
    const chunk = Number(remaining % 1000n);
    if (chunk > 0) parts.unshift(`${threeDigitWords(chunk)}${scales[group] ? ` ${scales[group]}` : ""}`);
    remaining /= 1000n;
    group += 1;
  }
  return `${parts.join(" و ")} تومان`;
}

function quickAmountLabel(value: number): string {
  if (value % 1_000_000 === 0) return `${groupedNumber.format(value / 1_000_000)} میلیون`;
  if (value % 1_000 === 0) return `${groupedNumber.format(value / 1_000)} هزار`;
  return groupedNumber.format(value);
}

export function AmountInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  required,
  min,
  max,
  error,
  quickAmounts = [100_000, 1_000_000],
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  error?: string;
  quickAmounts?: number[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const normalized = normalizeAmount(value);
  const display = normalized.length === 0 ? "" : groupedNumber.format(BigInt(normalized));
  const numericValue = normalized.length === 0 ? null : Number(normalized);
  const rangeError =
    numericValue !== null && min !== undefined && numericValue < min
      ? `حداقل مبلغ ${groupedNumber.format(min)} تومان است.`
      : numericValue !== null && max !== undefined && numericValue > max
        ? `حداکثر مبلغ ${groupedNumber.format(max)} تومان است.`
        : undefined;
  const message = rangeError ?? error;
  const messageId = id ? `${id}-message` : undefined;

  useLayoutEffect(() => {
    if (caretDigits.current === null || inputRef.current === null) return;
    let seen = 0;
    let position = display.length;
    for (let index = 0; index < display.length; index += 1) {
      const character = display[index] ?? "";
      if (/\d/.test(character) || faDigits.includes(character)) seen += 1;
      if (seen >= caretDigits.current) {
        position = index + 1;
        break;
      }
    }
    inputRef.current.setSelectionRange(position, position);
    caretDigits.current = null;
  }, [display]);

  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <div
        className={`relative flex items-center rounded-lg border border-input bg-background/60 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-ring/60 motion-reduce:transition-none ${message ? "border-error/60" : ""} ${className ?? "h-10 w-full"}`}
      >
        <input
          id={id}
          ref={inputRef}
          dir="ltr"
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          required={required}
          aria-invalid={message ? true : undefined}
          aria-describedby={messageId}
          onChange={(event) => {
            const beforeCaret = event.target.value.slice(0, event.target.selectionStart ?? event.target.value.length);
            caretDigits.current = normalizeAmount(beforeCaret).length;
            onChange(normalizeAmount(event.target.value));
          }}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <span className="shrink-0 px-3 text-sm text-muted-foreground" aria-hidden>
          تومان
        </span>
      </div>
      {quickAmounts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">مقدار سریع:</span>
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(String(amount))}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {quickAmountLabel(amount)}
            </button>
          ))}
        </div>
      ) : null}
      <p id={messageId} className={message ? "text-xs text-error" : "text-xs text-muted-foreground"} aria-live="polite">
        {message ?? (normalized.length > 0 ? amountInPersianWords(normalized) : "")}
      </p>
    </div>
  );
}
