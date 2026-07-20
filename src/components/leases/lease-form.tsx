"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";

interface Option { id: string; name: string; address?: string; }

interface Props {
  customers: Option[];
  properties: Option[];
}

interface FormData {
  customer_id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  deposit: string;
  payment_day: string;
  notes: string;
}

const EMPTY: FormData = {
  customer_id: "", property_id: "", start_date: "", end_date: "",
  monthly_rent: "", deposit: "", payment_day: "1", notes: "",
};

export function AddLeaseButton({ customers, properties }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customer_id) { setError("请选择客户"); return; }
    if (!form.property_id) { setError("请选择房源"); return; }
    if (!form.start_date) { setError("请选择开始日期"); return; }
    if (!form.end_date) { setError("请选择结束日期"); return; }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("leases").insert({
      customer_id: form.customer_id,
      property_id: form.property_id,
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : 0,
      deposit: form.deposit ? parseFloat(form.deposit) : null,
      payment_day: form.payment_day ? parseInt(form.payment_day, 10) : 1,
      notes: form.notes.trim() || null,
      status: "active",
    });

    setSaving(false);

    if (insertError) {
      if (insertError.code === "42P01") {
        setError("数据库表不存在，请先执行 SQL 迁移");
      } else {
        setError(insertError.message);
      }
      return;
    }

    setForm(EMPTY);
    setOpen(false);
    router.refresh();
  }

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        添加租约
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>添加租约</CardTitle>
                <CardDescription>建立客户与房源的租约关系</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => !saving && setOpen(false)}>
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">客户 <span className="text-destructive">*</span></label>
                  <select className={selectClass} value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)} disabled={saving}>
                    <option value="">选择客户...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">房源 <span className="text-destructive">*</span></label>
                  <select className={selectClass} value={form.property_id} onChange={(e) => set("property_id", e.target.value)} disabled={saving}>
                    <option value="">选择房源...</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.address ? ` - ${p.address}` : ""}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">开始日期 <span className="text-destructive">*</span></label>
                    <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">结束日期 <span className="text-destructive">*</span></label>
                    <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} disabled={saving} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">月租 (元)</label>
                    <Input type="number" placeholder="2500" value={form.monthly_rent} onChange={(e) => set("monthly_rent", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">押金</label>
                    <Input type="number" placeholder="5000" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">付款日</label>
                    <Input type="number" min="1" max="31" placeholder="1" value={form.payment_day} onChange={(e) => set("payment_day", e.target.value)} disabled={saving} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">备注</label>
                  <Input placeholder="备注信息" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={saving} />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>取消</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    保存
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}