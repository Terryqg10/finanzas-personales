export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="bg-secondary h-8 w-48 animate-pulse rounded" />
      <div className="bg-secondary h-32 animate-pulse rounded-md" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-secondary h-64 animate-pulse rounded-md" />
        <div className="bg-secondary h-64 animate-pulse rounded-md" />
      </div>
    </div>
  );
}
