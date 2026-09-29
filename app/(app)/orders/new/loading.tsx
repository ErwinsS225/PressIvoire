import { HeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function NewOrderLoading() {
  return (
    <div className="h-full overflow-hidden animate-fade-in space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-3 px-5">
        <div className="space-y-4 md:col-span-2">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
