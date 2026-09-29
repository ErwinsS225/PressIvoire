import { HeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="h-full overflow-hidden animate-fade-in space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-3 px-5">
        <div className="space-y-4 md:col-span-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
