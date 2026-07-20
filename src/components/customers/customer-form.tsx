"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parseDocumentText } from "@/lib/ai/document-parser";
import { Camera, Loader2, Plus, X } from "lucide-react";

interface CustomerFormData {
  name: string; email: string; phone: string; wechat: string; id_card: string; notes: string;
}

interface CustomerFormProps {
  mode?: "add" | "edit";
  initialData?: CustomerFormData;
  customerId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const EMPTY: CustomerFormData = { name: "", email: "", phone: "", wechat: "", id_card: "", notes: "" };

export function CustomerForm({ mode = "add", initialData, customerId, trigger, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";

  // Auto-open when editing
  useEffect(() => { if (isEdit && initialData) { setOpen(true); setForm(initialData); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof CustomerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("仅支持 PNG、JPG、JPEG 格式图片");
      return;
    }
    setOcrLoading(true);
    try {
      const text = await extractTextFromImage(file);
      const parsed = parseDocumentText(text);
      const parts: string[] = [];
      if (parsed.community) parts.push(`小区: ${parsed.community}`);
      if (parsed.address) parts.push(`地址: ${parsed.address}`);
      if (parsed.area) parts.push(`面积: ${parsed.area}㎡`);
      if (parsed.price) parts.push(`价格: ${parsed.price}`);
      if (parsed.room) parts.push(`户型: ${parsed.room}`);
      if (parsed.floor) parts.push(`楼层: ${parsed.floor}`);
      if (parsed.remark) parts.push(`备注: ${parsed.remark}`);
      setForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        phone: parsed.phone || prev.phone,
        notes: parts.length > 0 ? parts.join("; ") : prev.notes,
      }));
    } catch {
      setError("图片识别失败，请尝试更清晰的图片");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("请输入姓名"); return; }
    setSaving(true);
    const supabase = createClient();
    if (isEdit && customerId) {
      const { error: updateError } = await supabase.from("customers").update({
        name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
        wechat: form.wechat.trim() || null, id_card: form.id_card.trim() || null,
        notes: form.notes.trim() || null,
      }).eq("id", customerId);
      setSaving(false);
      if (updateError) {
        if (updateError.code === "23505") setError("此邮箱已存在");
        else if (updateError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移");
        else setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("customers").insert({
        name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
        wechat: form.wechat.trim() || null, id_card: form.id_card.trim() || null,
        notes: form.notes.trim() || null, status: "active",
      });
      setSaving(false);
      if (insertError) {
        if (insertError.code === "23505") setError("此邮箱已存在");
        else if (insertError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移");
        else setError(insertError.message);
        return;
      }
    }
    setForm(EMPTY); setOpen(false);
    if (onSuccess) onSuccess();
    router.refresh();
  }

  const title = isEdit ? "编辑客户" : "添加客户";
  const desc = isEdit ? "修改客户信息" : "输入客户信息或上传证件图片自动识别";

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> 添加客户
        </Button>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleOcrUpload} className="hidden" />
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && !ocrLoading && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="上传图片智能识别" disabled={ocrLoading || saving} onClick={() => fileRef.current?.click()}>
                  {ocrLoading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => !saving && setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ocrLoading && (
                <div className="mb-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> AI 正在识别图片...
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">姓名 <span className="text-destructive">*</span></label>
                  <Input placeholder="请输入姓名" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">邮箱</label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">电话</label>
                  <Input placeholder="+86 138-0000-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">微信</label>
                  <Input placeholder="微信号" value={form.wechat} onChange={(e) => set("wechat", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">身份证号</label>
                  <Input placeholder="身份证号码" value={form.id_card} onChange={(e) => set("id_card", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注</label>
                  <Input placeholder="备注信息" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={saving} />
                </div>
                {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>取消</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />} 保存
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

export function AddCustomerButton() {
  return <CustomerForm mode="add" />;
}