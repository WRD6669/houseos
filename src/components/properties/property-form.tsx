"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";

interface PropertyFormData {
  name: string; address: string; area: string; rooms: string; rent: string;
  owner_name: string; owner_phone: string; notes: string;
}

interface PropertyFormProps {
  mode?: "add" | "edit";
  initialData?: PropertyFormData;
  propertyId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const EMPTY: PropertyFormData = { name: "", address: "", area: "", rooms: "", rent: "", owner_name: "", owner_phone: "", notes: "" };

export function PropertyForm({ mode = "add", initialData, propertyId, trigger, onSuccess }: PropertyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  useEffect(() => { if (isEdit && initialData) { setOpen(true); setForm(initialData); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof PropertyFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("请输入房源名称"); return; }
    if (!form.address.trim()) { setError("请输入地址"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(), address: form.address.trim(),
      area: form.area ? parseFloat(form.area) : null, rooms: form.rooms ? parseInt(form.rooms, 10) : null,
      rent: form.rent ? parseFloat(form.rent) : 0, owner_name: form.owner_name.trim() || null,
      owner_phone: form.owner_phone.trim() || null, notes: form.notes.trim() || null,
    };
    if (isEdit && propertyId) {
      const { error: updateError } = await supabase.from("properties").update(payload).eq("id", propertyId);
      setSaving(false);
      if (updateError) { if (updateError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移"); else setError(updateError.message); return; }
    } else {
      const { error: insertError } = await supabase.from("properties").insert({ ...payload, status: "vacant", city: "", type: "apartment" });
      setSaving(false);
      if (insertError) { if (insertError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移"); else setError(insertError.message); return; }
    }
    setForm(EMPTY); setOpen(false);
    if (onSuccess) onSuccess();
    router.refresh();
  }

  const title = isEdit ? "编辑房源" : "添加房源";
  const desc = isEdit ? "修改房源信息" : "填写以下房源信息";

  return (
    <>
      {trigger ? (<div onClick={() => setOpen(true)}>{trigger}</div>) : (
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> 添加房源</Button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></div>
              <Button variant="ghost" size="icon" onClick={() => !saving && setOpen(false)}><X className="size-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">名称 <span className="text-destructive">*</span></label>
                    <Input placeholder="如：十四佳园 1-3-301" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} autoFocus />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">月租 (元)</label>
                    <Input type="number" placeholder="如：2500" value={form.rent} onChange={(e) => set("rent", e.target.value)} disabled={saving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">地址 <span className="text-destructive">*</span></label>
                  <Input placeholder="详细地址" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={saving} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">面积 (㎡)</label>
                    <Input type="number" placeholder="如：94" value={form.area} onChange={(e) => set("area", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">房间数</label>
                    <Input type="number" placeholder="如：3" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} disabled={saving} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">房东姓名</label>
                    <Input placeholder="房东姓名" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">房东电话</label>
                    <Input placeholder="+86 138-0000-0000" value={form.owner_phone} onChange={(e) => set("owner_phone", e.target.value)} disabled={saving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注</label>
                  <Input placeholder="备注信息" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={saving} />
                </div>
                {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>取消</Button>
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} 保存</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function AddPropertyButton() { return <PropertyForm mode="add" />; }