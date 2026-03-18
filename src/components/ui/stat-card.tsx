import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  accent = "signal",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "signal" | "ink" | "success";
}) {
  return (
    <div className="border border-line bg-paper p-5">
      <div
        className={cn(
          "mb-4 h-1 w-full",
          accent === "signal" && "bg-signal",
          accent === "ink" && "bg-ink",
          accent === "success" && "bg-success",
        )}
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
