import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectGroup = { label: string; options: SelectOption[] };

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Flat options; ignored when `groups` is set. */
  options?: SelectOption[];
  /** Grouped options rendered as native <optgroup>. */
  groups?: SelectGroup[];
  placeholder?: string;
  /** Optional error message; renders below and sets aria-invalid. */
  error?: string;
}

/**
 * انتخاب. A styled native <select>: keyboard navigation, focus management and
 * mobile pickers work for free. The chevron sits at the inline-end (left in RTL).
 */
export function Select({ className, options = [], groups, placeholder, error, ...props }: SelectProps) {
  const invalid = error !== undefined;
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          aria-invalid={invalid ? true : undefined}
          className={cn(
            "h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background/60 ps-3 pe-9 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive/60",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {groups
            ? groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}