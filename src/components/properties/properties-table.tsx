"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { PropertyForm } from "@/components/properties/property-form";
import { Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import type { PropertyWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rented:      { label: "已租",   variant: "default" },
  vacant:      { label: "空置",   variant: "secondary" },
  maintenance: { label: "维护中", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  apartment: "公寓",
  house: "别墅",
  commercial: "商铺",
};

function formatRent(rent: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency", currency: "CNY", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(rent);
}

interface Props {
  initialData: PropertyWithDetails[];
}

export function PropertiesTable({ initialData }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PropertyWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<PropertyWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filtered = initialData.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.owner_name && p.owner_name.toLowerCase().includes(q))
    );
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("properties").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ type: "error", message: "删除失败：" + error.message });
    } else {
      setToast({ type: "success", message: "已删除房源「" + deleteTarget.name + "」" });
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>全部房源</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="搜索房源..." className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <CardDescription>房源列表中所有房源信息</CardDescription>
        </CardHeader>
        <CardContent>
          {toast && (
            <div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)}><X className="size-3.5" /></button>
            </div>
          )}
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
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((property) => {
                  const status = STATUS_MAP[property.status] ?? { label: property.status, variant: "outline" as const };
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
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{property.owner_name ?? "\u2014"}</TableCell>
                      <TableCell>{formatRent(property.rent)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="编辑" onClick={() => setEditTarget(property)}>
                            <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="删除" onClick={() => setDeleteTarget(property)}>
                            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editTarget && (
        <PropertyForm
          mode="edit"
          propertyId={editTarget.id}
          initialData={{
            name: editTarget.name, address: editTarget.address ?? "",
            area: editTarget.area != null ? String(editTarget.area) : "",
            rooms: editTarget.rooms != null ? String(editTarget.rooms) : "",
            rent: editTarget.rent != null ? String(editTarget.rent) : "",
            owner_name: editTarget.owner_name ?? "", owner_phone: editTarget.owner_phone ?? "",
            notes: editTarget.notes ?? "",
          }}
          trigger={<span />}
          onSuccess={() => { setEditTarget(null); setToast({ type: "success", message: "已更新房源「" + editTarget.name + "」" }); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <Card className="relative z-10 w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>确认删除</CardTitle>
              <CardDescription>该操作不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">确定要删除房源「<strong>{deleteTarget.name}</strong>」吗？</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}