"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { PropertyWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rented:    { label: "已租",    variant: "default" },
  vacant:      { label: "空置",      variant: "secondary" },
  maintenance: { label: "维护中", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  apartment: "公寓",
  house: "别墅",
  commercial: "商铺",
};

function formatRent(rent: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rent);
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
      (p.owner_name && p.owner_name.toLowerCase().includes(q))
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>全部房源</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="搜索房源..."
              className="pl-8 h-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <CardDescription>房源列表中所有房源信息</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {query.trim() ? (
              <p>未找到匹配 &ldquo;{query}&rdquo; 的房源。</p>
            ) : (
              <p>暂无房源。添加第一个房源开始吧。</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>房源</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>房东</TableHead>
                <TableHead>月租</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => {
                const status = STATUS_MAP[property.status] ?? {
                  label: property.status,
                  variant: "outline" as const,
                };
                const typeLabel = TYPE_MAP[property.type] ?? property.type;
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{property.name}</div>
                        <div className="text-xs text-muted-foreground">{property.address}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{typeLabel}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {property.owner_name ?? "\u2014"}
                    </TableCell>
                    <TableCell>{formatRent(property.rent)}</TableCell>
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