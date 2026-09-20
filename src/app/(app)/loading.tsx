export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="bg-secondary h-8 w-48 animate-pulse rounded-xl" />
      <div className="bg-secondary h-32 animate-pulse rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-secondary h-64 animate-pulse rounded-2xl" />
        <div className="bg-secondary h-64 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
