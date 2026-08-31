export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-white py-16 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-white border border-border" />
      ))}
    </div>
  );
}
