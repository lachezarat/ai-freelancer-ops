import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "signal" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 text-[11px] font-mono uppercase tracking-[0.22em]",
        tone === "signal" && "border-signal bg-signal/10 text-signal",
        tone === "success" && "border-success bg-success/10 text-success",
        tone === "neutral" && "border-line bg-paper text-muted",
      )}
    >
      {children}
    </span>
  );
}
