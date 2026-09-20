import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "secondary" | "outline" | "ghost" | "brand" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-line disabled:text-muted",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border disabled:bg-paper disabled:text-muted",
  outline:
    "border border-input bg-transparent hover:bg-accent-soft hover:text-accent-dark disabled:border-line disabled:text-muted",
  ghost: "hover:bg-accent-soft hover:text-accent-dark disabled:text-muted",
  brand: "bg-brand text-brand-foreground hover:bg-brand/90 disabled:bg-line disabled:text-muted",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 disabled:bg-line disabled:text-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
  icon: "size-10 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none active:scale-[0.98]",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
