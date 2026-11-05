import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-card" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
