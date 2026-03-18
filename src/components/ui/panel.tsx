import { cn } from "@/lib/utils";

export function Panel({
  title,
  kicker,
  action,
  children,
  className,
}: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel-shadow border border-line bg-paper p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {kicker ? (
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              {kicker}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
