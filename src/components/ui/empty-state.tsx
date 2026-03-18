export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-dashed border-line bg-paper p-6">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-muted">{body}</p>
    </div>
  );
}
