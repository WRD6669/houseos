"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { CustomerWithPropertyCount } from "@/lib/supabase/types";

// Map DB status (lowercase) to UI display + badge variant
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  活跃:   { label: "活跃",   variant: "default" },
  in活跃: { label: "In活跃", variant: "outline" },
  pending:  { label: "Pending",  variant: "secondary" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

interface Props {
  initialData: CustomerWithPropertyCount[];
}

export function CustomersTable({ initialData }: Props) {
  const [query, setQuery] = useState("");

  const filtered = initialData.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase()?.includes(q) ?? false) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>All Customers</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="搜索客户..."
              className="pl-8 h-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <CardDescription>A list of all customers in your database.</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {query.trim() ? (
              <p>No customers matching &quot;{query}&quot;.</p>
            ) : (
              <p>No customers yet. Add your first customer to get started.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => {
                const status = STATUS_MAP[customer.status] ?? {
                  label: customer.status,
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{customer.property_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </TableCell>
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
