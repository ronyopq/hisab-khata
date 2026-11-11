import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div className="space-y-4 p-4"><Skeleton className="h-40 w-full" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-64 w-full" /></div>;
}
