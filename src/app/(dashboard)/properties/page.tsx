import { fetchProperties, isSupabaseConfigured } from "@/lib/supabase/data";
import { PropertiesTable } from "@/components/properties/properties-table";
import { AddPropertyButton } from "@/components/properties/property-form";
import { ImportButton } from "@/components/properties/import-button";
import { AiImportButton } from "@/components/properties/ai-import-button";

export default async function PropertiesPage() {
  const pageTitle = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">房源管理</h1>
        <p className="text-sm text-muted-foreground">管理您的房源</p>
      </div>
      <div className="flex items-center gap-2">
        <AiImportButton />
        <ImportButton />
        <AddPropertyButton />
      </div>
    </div>
  );

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        {pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <svg className="size-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-6.364A9 9 0 1 1 6.636 6.636a9 9 0 0 1 12.728 12.728Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-medium">Supabase 未配置</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            请打开 <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            为你的 Supabase 项目凭据
          </p>
        </div>
      </div>
    );
  }

  const { data: properties, error } = await fetchProperties();

  if (error === "TABLES_NOT_FOUND") {
    return (
      <div className="space-y-6">
        {pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <svg className="size-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-medium">数据库表不存在</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Run the SQL migration in your Supabase SQL Editor:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/migrations/001_initial_schema.sql</code>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-medium">连接错误</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageTitle}
      <PropertiesTable initialData={properties ?? []} />
    </div>
  );
}
