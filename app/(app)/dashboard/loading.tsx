import { ScreenSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <ScreenSkeleton stats={2} rows={3} />;
}
