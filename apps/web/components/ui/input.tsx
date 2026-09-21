import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Content rendered at the inline-start edge (e.g. a country code). */
  startAddon?: React.ReactNode;
  /** Content rendered at the inline-end edge (e.g. a unit or icon). */
  endAddon?: React.ReactNode;
  /** Optional error message; renders below and sets aria-invalid. */
  error?: string;
}

function withError(node: React.ReactNode, error?: string, errorId?: string) {
  if (!error) return node;
  return (
    <div className="space-y-1.5">
      {node}
      <p id={errorId} className="text-xs text-destructive">
        {error}
      </p>
    </div>
  );
}

/**
 * ورودی متن. Persian text is RTL by default; pass `dir="ltr"` for phone
 * numbers, emails and codes so digits keep their natural order.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, startAddon, endAddon, error, id, dir, ...props },
  ref,
) {
  const grouped = startAddon !== undefined || endAddon !== undefined;
  const invalid = error !== undefined;
  const errorId = id ? `${id}-error` : undefined;

  const input = (
    <input
      ref={ref}
      id={id}
      type={type}
      dir={grouped ? undefined : dir}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={cn(
        "flex w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70",
        "disabled:cursor-not-allowed disabled:opacity-50",
        grouped
          ? "h-full px-0 outline-none focus:outline-none focus-visible:outline-none"
          : cn(
              "h-10 rounded-lg border border-input bg-background/60 px-3 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-transparent",
              invalid && "border-destructive/60",
            ),
        className,
      )}
      {...props}
    />
  );

  if (!grouped) return withError(input, error, errorId);

  // The whole group takes the direction, so a `dir="ltr"` phone field puts «+98» on the left.
  return withError(
    <div
      dir={dir}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background/60 px-3 text-sm transition-colors",
        "focus-within:border-transparent focus-within:ring-2 focus-within:ring-ring/60",
        invalid && "border-destructive/60",
      )}
    >
      {startAddon && <span className="shrink-0 text-muted-foreground">{startAddon}</span>}
      {input}
      {endAddon && <span className="shrink-0 text-muted-foreground">{endAddon}</span>}
    </div>,
    error,
    errorId,
  );
});