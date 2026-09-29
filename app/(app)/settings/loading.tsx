import { HeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="h-full overflow-hidden animate-fade-in space-y-6">
      <HeaderSkeleton />
      <div className="space-y-6 px-5 max-w-4xl">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
