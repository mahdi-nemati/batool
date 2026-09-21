import * as React from "react";
import { cn } from "@/lib/cn";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Visually de-emphasizes the label (e.g. for a disabled control). */
  disabled?: boolean;
}

/** برچسب. A native <label>: associates with the control via `htmlFor`. */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, disabled, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-6 text-foreground/90",
        disabled && "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});