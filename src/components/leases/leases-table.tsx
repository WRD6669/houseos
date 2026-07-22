"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { LeaseForm } from "@/components/leases/lease-form";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import type { LeaseWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "进行中", variant: "default" },
  expired: { label: "已到期", variant: "secondary" },
  terminated: { label: "已终止", variant: "destructive" },
};

function formatDate(iso: string) { return new Date(iso).toISOString().slice(0, 10); }
function formatRent(n: number) { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(n); }

interface Props {
  leases: LeaseWithDetails[];
}

export function LeasesTable({ leases: initialLeases }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<LeaseWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<LeaseWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const customerOptions = [...new Map(initialLeases.map((l) => [l.customer_id, { id: l.customer_id, name: l.customer_name }])).values()];
  const propertyOptions = [...new Map(initialLeases.map((l) => [l.property_id, { id: l.property_id, name: l.property_name, address: l.property_address }])).values()];

  const allSelected = initialLeases.length > 0 && initialLeases.every((l) => selectedIds.has(l.id));

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialLeases.map((l) => l.id)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("leases").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ type: "error", message: "删除失败：" + error.message });
    } else {
      setToast({ type: "success", message: "已删除租约（" + deleteTarget.customer_name + " - " + deleteTarget.property_name + "）" });
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("leases").delete().in("id", ids);
    setBatchDeleting(false);
    setSelectedIds(new Set());
    setShowBatchConfirm(false);
    if (error) {
      setToast({ type: "error", message: "批量删除失败：" + error.message });
    } else {
      setToast({ type: "success", message: "已删除 " + ids.length + " 条租约" });
    }
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>全部租约</CardTitle>
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setShowBatchConfirm(true)} disabled={batchDeleting}>
                <Trash2 className="size-4 mr-1" />
                删除选中 ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {toast && (
            <div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)}><X className="size-3.5" /></button>
            </div>
          )}
          {initialLeases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无租约。创建第一个租约开始吧。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>租客</TableHead><TableHead>房源</TableHead><TableHead>月租</TableHead>
                  <TableHead>开始日期</TableHead><TableHead>结束日期</TableHead><TableHead>状态</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLeases.map((l) => {
                  const s = STATUS_MAP[l.status] ?? { label: l.status, variant: "outline" as const };
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(l.id)}
                          onChange={() => toggleSelect(l.id)}
                          className="size-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{l.customer_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{l.property_name}</div>
                        <div className="text-xs text-muted-foreground">{l.property_address}</div>
                      </TableCell>
                      <TableCell>{formatRent(l.monthly_rent)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(l.start_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(l.end_date)}</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="编辑" onClick={() => setEditTarget(l)}>
                            <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="删除" onClick={() => setDeleteTarget(l)}>
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
        <LeaseForm
          mode="edit"
          leaseId={editTarget.id}
          customers={customerOptions}
          properties={propertyOptions}
          initialData={{
            customer_id: editTarget.customer_id,
            property_id: editTarget.property_id,
            start_date: formatDate(editTarget.start_date),
            end_date: formatDate(editTarget.end_date),
            monthly_rent: String(editTarget.monthly_rent),
            deposit: editTarget.deposit != null ? String(editTarget.deposit) : "",
            payment_day: String(editTarget.payment_day ?? 1),
            notes: editTarget.notes ?? "",
          }}
          trigger={<span />}
          onSuccess={() => { setEditTarget(null); setToast({ type: "success", message: "已更新租约" }); }}
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
              <p className="text-sm">确定要删除「<strong>{deleteTarget.customer_name}</strong>」与「<strong>{deleteTarget.property_name}</strong>」的租约吗？</p>
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

      {showBatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => !batchDeleting && setShowBatchConfirm(false)} />
          <Card className="relative z-10 w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>批量删除确认</CardTitle>
              <CardDescription>该操作不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">确定要删除选中的 <strong>{selectedIds.size}</strong> 条租约吗？</p>
              <p className="text-xs text-muted-foreground">删除后无法恢复。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBatchConfirm(false)} disabled={batchDeleting}>取消</Button>
                <Button variant="destructive" onClick={handleBatchDelete} disabled={batchDeleting}>
                  {batchDeleting && <Loader2 className="size-4 animate-spin" />}
                  确认删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
