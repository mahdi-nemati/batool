"use client";

import { useLayoutEffect, useRef } from "react";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeMoney(value: string): string {
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

export function MoneyInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  required,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const display = value.length === 0 ? "" : new Intl.NumberFormat("fa-IR").format(BigInt(value));
  useLayoutEffect(() => {
    if (caretDigits.current === null || inputRef.current === null) return;
    let seen = 0;
    let position = display.length;
    for (let index = 0; index < display.length; index += 1) {
      if (/\d/.test(display[index] ?? "") || faDigits.includes(display[index] ?? "")) seen += 1;
      if (seen >= caretDigits.current) {
        position = index + 1;
        break;
      }
    }
    inputRef.current.setSelectionRange(position, position);
    caretDigits.current = null;
  }, [display]);
  return (
    <input
      id={id}
      ref={inputRef}
      dir="ltr"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      required={required}
      onChange={(event) => {
        const beforeCaret = event.target.value.slice(
          0,
          event.target.selectionStart ?? event.target.value.length,
        );
        caretDigits.current = normalizeMoney(beforeCaret).length;
        onChange(normalizeMoney(event.target.value));
      }}
      className={className}
    />
  );
}
