import * as React from "react";
import { cn } from "@/lib/cn";

/** اسکلت. A quiet loading placeholder for the light Batool theme. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      {...props}
    />
  );
}