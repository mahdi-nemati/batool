"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function fa(value: number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with content instead of scrolling. */
  autoResize?: boolean;
  /** Show a «۲۴ / ۱۲۰» counter (requires maxLength). */
  showCount?: boolean;
  /** Optional error message; renders below and sets aria-invalid. */
  error?: string;
}

/** متن چندخطی با شمارندهی فارسی و ارتفاع خودکار اختیاری. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, autoResize, showCount, maxLength, onChange, value, defaultValue, dir, error, ...props },
  ref,
) {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = React.useState(() => String(value ?? defaultValue ?? "").length);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize]);

  React.useEffect(resize, [resize, value]);

  const invalid = error !== undefined;

  return (
    <div className={cn("space-y-1", autoResize && "flex flex-col")}>
      <textarea
        ref={setRefs}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        dir={dir}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => {
          setLen(event.target.value.length);
          resize();
          onChange?.(event);
        }}
        className={cn(
           "flex min-h-20 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-body leading-7 text-foreground",
          "placeholder:text-muted-foreground/70 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
           invalid && "border-error/60",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        {...props}
      />
       {error && <p className="text-label text-error">{error}</p>}
      {showCount && maxLength && (
        <p className="text-end text-[11px] text-muted-foreground" aria-live="polite">
          {fa(len)} / {fa(maxLength)}
        </p>
      )}
    </div>
  );
});
