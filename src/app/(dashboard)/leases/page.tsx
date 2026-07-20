import { Suspense } from "react";
import { fetchLeases, fetchCustomers, fetchProperties, isSupabaseConfigured } from "@/lib/supabase/data";
import { AddLeaseButton } from "@/components/leases/lease-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaseWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "secondary" },
  terminated: { label: "Terminated", variant: "destructive" },
};

function formatDate(iso: string) { return new Date(iso).toISOString().slice(0, 10); }
function formatRent(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n); }

function LeasesTable({ leases }: { leases: LeaseWithDetails[] }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>All Leases</CardTitle></CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No leases yet. Create your first lease to get started.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead><TableHead>Property</TableHead><TableHead>Rent</TableHead>
                <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((l) => {
                const s = STATUS_MAP[l.status] ?? { label: l.status, variant: "outline" as const };
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.customer_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{l.property_name}</div>
                      <div className="text-xs text-muted-foreground">{l.property_address}</div>
                    </TableCell>
                    <TableCell>{formatRent(l.monthly_rent)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(l.start_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(l.end_date)}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

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
        <h1 className="text-2xl font-semibold tracking-tight">Leases</h1>
        <p className="text-sm text-muted-foreground">Manage lease agreements between customers and properties.</p>
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
          <h3 className="mb-1 text-lg font-medium">Supabase Not Configured</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Open <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and set <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
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
          <h3 className="mb-1 text-lg font-medium">Database Tables Not Found</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">Run the SQL migrations in your Supabase SQL Editor.</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-6">{pageTitle}
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">Connection Error</h3>
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
