"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { PropertyWithDetails } from "@/lib/supabase/types";

// Map DB status/type (lowercase) to UI display + badge variant
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  occupied:    { label: "Occupied",    variant: "default" },
  vacant:      { label: "Vacant",      variant: "secondary" },
  maintenance: { label: "Maintenance", variant: "destructive" },
};

function formatRent(rent: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rent);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface Props {
  initialData: PropertyWithDetails[];
}

export function PropertiesTable({ initialData }: Props) {
  const [query, setQuery] = useState("");

  const filtered = initialData.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.tenant_name && p.tenant_name.toLowerCase().includes(q))
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>All Properties</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              className="pl-8 h-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <CardDescription>A list of all properties in your portfolio.</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {query.trim() ? (
              <p>No properties matching &quot;{query}&quot;.</p>
            ) : (
              <p>No properties yet. Add your first property to get started.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>City</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => {
                const status = STATUS_MAP[property.status] ?? {
                  label: capitalize(property.status),
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{property.name}</div>
                        <div className="text-xs text-muted-foreground">{property.address}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {capitalize(property.type)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {property.tenant_name ?? "\u2014"}
                    </TableCell>
                    <TableCell>{formatRent(property.rent)}</TableCell>
                    <TableCell className="text-muted-foreground">{property.city}</TableCell>
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
