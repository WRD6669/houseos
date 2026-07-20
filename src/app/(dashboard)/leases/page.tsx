import { Suspense } from "react";
import { fetchLeases, fetchCustomers, fetchProperties, isSupabaseConfigured } from "@/lib/supabase/data";
import { AddLeaseButton } from "@/components/leases/lease-form";
import { LeasesTable } from "@/components/leases/leases-table";

async function LeaseButtonWrapper() {
  const { data: customers } = await fetchCustomers();
  const { data: properties } = await fetchProperties();
  const customerOptions = (customers || []).map((c) => ({ id: c.id, name: c.name }));
  const propertyOptions = (properties || []).map((p) => ({ id: p.id, name: p.name, address: p.address }));
  return <AddLeaseButton customers={customerOptions} properties={propertyOptions} />;
}

export default async function LeasesPage() {
  const pageTitle = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">租约管理</h1>
        <p className="text-sm text-muted-foreground">管理客户与房源的租约关系</p>
      </div>
      <Suspense fallback={null}>
        <LeaseButtonWrapper />
      </Suspense>
    </div>
  );

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">{pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <svg className="size-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-6.364A9 9 0 1 1 6.636 6.636a9 9 0 0 1 12.728 12.728Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-medium">Supabase 未配置</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            请打开 <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> 并设置{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> 和{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
          </p>
        </div>
      </div>
    );
  }

  const { data: leases, error } = await fetchLeases();
  if (error === "TABLES_NOT_FOUND") {
    return (
      <div className="space-y-6">{pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">数据库表不存在</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">请在 Supabase SQL 编辑器中执行迁移文件</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-6">{pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">连接错误</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageTitle}
      <LeasesTable leases={leases ?? []} />
    </div>
  );
}