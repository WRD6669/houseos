"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  const filtered = initialData.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase()?.includes(q) ?? false) ||
      (c.phone && c.phone.includes(q))
    );
  });

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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>全部客户</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="搜索客户..." className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          initialData={{ name: editTarget.name, email: editTarget.email ?? "", phone: editTarget.phone ?? "", wechat: editTarget.wechat ?? "", id_card: editTarget.id_card ?? "", notes: editTarget.notes ?? "" }}
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
    </>
  );
}