import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "brand"
  | "destructive";

const variants: Record<Variant, string> = {
  default: "text-brand",
  secondary: "text-muted-foreground",
  outline: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  brand: "text-brand",
  destructive: "text-destructive",
};

/** نشان. A compact text-only semantic label. */
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
