"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { CustomerForm } from "@/components/customers/customer-form";
import { Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import type { CustomerWithPropertyCount } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:   { label: "活跃",   variant: "default" },
  inactive: { label: "非活跃", variant: "outline" },
  pending:  { label: "待处理",  variant: "secondary" },
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

interface Props {
  initialData: CustomerWithPropertyCount[];
}

export function CustomersTable({ initialData }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithPropertyCount | null>(null);
  const [editTarget, setEditTarget] = useState<CustomerWithPropertyCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const filtered = initialData.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase()?.includes(q) ?? false) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

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
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error, data } = await supabase.from("customers").delete().eq("id", deleteTarget.id).select("id");
    setDeleting(false);
    if (error) {
      setToast({ type: "error", message: "删除失败：" + error.message });
    } else if (!data || data.length === 0) {
      setToast({ type: "error", message: "删除失败：未能删除此记录，请检查数据库权限" });
    } else {
      setToast({ type: "success", message: "已删除客户「" + deleteTarget.name + "」" });
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    let errorMsg = "";

    // 1. Check for deal records
    const { data: dealCustomers } = await supabase
      .from("customer_properties")
      .select("customer_id")
      .in("customer_id", ids)
      .eq("relation_type", "deal");

    if (dealCustomers && dealCustomers.length > 0) {
      setToast({ type: "error", message: "部分客户已有成交记录，建议修改为关闭状态。已取消批量删除。" });
      setBatchDeleting(false);
      return;
    }

    // 2. Delete follow_ups
    const { error: fuErr } = await supabase.from("customer_follow_ups").delete().in("customer_id", ids);
    if (fuErr) { errorMsg = fuErr.message; }

    // 3. Delete customer_properties
    if (!errorMsg) {
      const { error: cpErr } = await supabase.from("customer_properties").delete().in("customer_id", ids);
      if (cpErr) { errorMsg = cpErr.message; }
    }

    // 4. Delete customers
    if (!errorMsg) {
      const { error: cErr } = await supabase.from("customers").delete().in("id", ids);
      if (cErr) { errorMsg = cErr.message; }
    }

    setBatchDeleting(false);
    setShowBatchConfirm(false);
    setSelectedIds(new Set());

    if (errorMsg) {
      setToast({ type: "error", message: "批量删除失败：" + errorMsg });
    } else {
      setToast({ type: "success", message: "已删除 " + ids.length + " 个客户" });
    }
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>全部客户</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setShowBatchConfirm(true)} disabled={batchDeleting}>
                  {batchDeleting && <Loader2 className="size-4 animate-spin mr-1" />}
                  删除选中 ({selectedIds.size})
                </Button>
              )}
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="搜索客户..." className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
          </div>
          <CardDescription>数据库中所有客户列表</CardDescription>
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
                <p>未找到匹配 &ldquo;{query}&rdquo; 的客户。</p>
              ) : (
                <p>暂无客户。添加第一个客户开始吧。</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-gray-300 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>关联房源</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => {
                  const status = STATUS_MAP[customer.status] ?? { label: customer.status, variant: "outline" as const };
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                          className="size-4 rounded border-gray-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>{customer.property_count}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(customer.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="编辑" onClick={() => setEditTarget(customer)}>
                            <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="删除" onClick={() => setDeleteTarget(customer)}>
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

      {/* Edit modal */}
      {editTarget && (
        <CustomerForm
          mode="edit"
          customerId={editTarget.id}
          initialData={{ name: editTarget.name, email: editTarget.email ?? "", phone: editTarget.phone ?? "", wechat: editTarget.wechat ?? "", id_card: editTarget.id_card ?? "", customer_type: editTarget.customer_type ?? "", budget_min: editTarget.budget_min != null ? String(editTarget.budget_min) : "", budget_max: editTarget.budget_max != null ? String(editTarget.budget_max) : "", target_city: editTarget.target_city ?? "", target_district: editTarget.target_district ?? "", target_community: editTarget.target_community ?? "", property_type_pref: editTarget.property_type_pref ?? "", bedrooms_pref: editTarget.bedrooms_pref != null ? String(editTarget.bedrooms_pref) : "", area_min: editTarget.area_min != null ? String(editTarget.area_min) : "", area_max: editTarget.area_max != null ? String(editTarget.area_max) : "", source: editTarget.source ?? "", manager: editTarget.manager ?? "", status: editTarget.status ?? "new", notes: editTarget.notes ?? "" }}
          trigger={<span />}
          onSuccess={() => { setEditTarget(null); setToast({ type: "success", message: "已更新客户「" + editTarget.name + "」" }); }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <Card className="relative z-10 w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>确认删除</CardTitle>
              <CardDescription>该操作不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">确定要删除客户「<strong>{deleteTarget.name}</strong>」吗？</p>
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

      {/* Batch Delete Confirm Dialog */}
      {showBatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" />
          <Card className="relative z-10 w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>批量删除确认</CardTitle>
              <CardDescription>该操作不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">确定要删除选中的 <strong>{selectedIds.size}</strong> 个客户吗？</p>
              <p className="text-xs text-muted-foreground">将同时删除关联的跟进记录和客户-房源关联。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBatchConfirm(false)}>取消</Button>
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
