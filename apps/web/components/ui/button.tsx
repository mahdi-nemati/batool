import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link"
  | "brand";
type Size = "sm" | "default" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-surface-sunken disabled:text-muted-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border disabled:bg-surface-canvas disabled:text-muted-foreground",
  outline:
    "border border-input bg-transparent hover:bg-accent-soft hover:text-income disabled:border-line disabled:text-muted-foreground",
  ghost: "hover:bg-accent-soft hover:text-income disabled:text-muted-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-surface-sunken disabled:text-muted-foreground",
  link: "text-primary underline-offset-4 hover:underline disabled:text-muted-foreground",
  brand:
    "bg-brand text-brand-foreground hover:bg-brand/90 disabled:bg-surface-sunken disabled:text-muted-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  default: "h-10 px-4 text-sm rounded-lg gap-2",
  md: "h-11 px-5 text-body rounded-lg gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
  icon: "size-10 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors",
        variant === "link" ? "" : "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
