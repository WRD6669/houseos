import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">客户管理</h1>
          <p className="text-sm text-muted-foreground">管理您的客户关系</p>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}