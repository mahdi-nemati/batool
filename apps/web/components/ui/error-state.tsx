import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** خطا. A generic error presentation; keep business logic out of it. */
export function ErrorState({ icon: Icon = TriangleAlert, title, description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
         "flex flex-col items-center gap-2 rounded-xl border border-dashed border-error/40 p-8 text-center",
        className,
      )}
    >
       <span className="flex size-10 items-center justify-center rounded-full bg-error/10">
         <Icon className="size-5 text-error" aria-hidden />
      </span>
      <p className="mt-1 text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
