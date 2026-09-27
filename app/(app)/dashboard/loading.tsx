import { ScreenSkeleton } from "@/components/mobile/skeleton";

export default function DashboardLoading() {
  return <ScreenSkeleton stats={2} rows={3} />;
}
