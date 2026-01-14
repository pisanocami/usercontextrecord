/**
 * ConfigurationSkeleton Component
 * 
 * Skeleton loader that matches ConfigurationCard layout.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ConfigurationSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * ConfigurationSkeletonList - Multiple skeletons for loading state
 */
export function ConfigurationSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ConfigurationSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * CompactConfigurationSkeleton - For mobile/compact views
 */
export function CompactConfigurationSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </Card>
  );
}
