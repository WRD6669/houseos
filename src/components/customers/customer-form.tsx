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
  name: string;
  email: string;
  phone: string;
  wechat: string;
  id_card: string;
  customer_type: string;
  budget_min: string;
  budget_max: string;
  target_city: string;
  target_district: string;
  target_community: string;
  property_type_pref: string;
  bedrooms_pref: string;
  area_min: string;
  area_max: string;
  source: string;
  manager: string;
  status: string;
  notes: string;
}

interface CustomerFormProps {
  mode?: "add" | "edit";
  initialData?: Partial<CustomerFormData>;
  customerId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const EMPTY: CustomerFormData = {
  name: "", email: "", phone: "", wechat: "", id_card: "",
  customer_type: "", budget_min: "", budget_max: "",
  target_city: "", target_district: "", target_community: "",
  property_type_pref: "", bedrooms_pref: "", area_min: "", area_max: "",
  source: "", manager: "", status: "new",
  notes: "",
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

export function CustomerForm({ mode = "add", initialData, customerId, trigger, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit && initialData) {
      setOpen(true);
      setForm({ ...EMPTY, ...initialData });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(field: keyof CustomerFormData, value: string) {
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
      setForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        phone: parsed.phone || prev.phone,
        notes: parsed.remark ? prev.notes + "; " + parsed.remark : prev.notes,
      }));
    } catch {
      setError("图片识别失败，请尝试更清晰的图片");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      wechat: form.wechat.trim() || null,
      id_card: form.id_card.trim() || null,
      customer_type: form.customer_type || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      target_city: form.target_city || null,
      target_district: form.target_district || null,
      target_community: form.target_community || null,
      property_type_pref: form.property_type_pref || null,
      bedrooms_pref: form.bedrooms_pref ? Number(form.bedrooms_pref) : null,
      area_min: form.area_min ? Number(form.area_min) : null,
      area_max: form.area_max ? Number(form.area_max) : null,
      source: form.source || null,
      manager: form.manager || null,
      notes: form.notes.trim() || null,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("请输入姓名"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = buildPayload();

    if (isEdit && customerId) {
      const { error: updateError } = await supabase.from("customers")
        .update({ ...payload, status: form.status || undefined })
        .eq("id", customerId);
      setSaving(false);
      if (updateError) {
        if (updateError.code === "23505") setError("记录已存在");
        else if (updateError.code === "42P01") setError("数据库表不存在，请先执行迁移");
        else setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("customers")
        .insert({ ...payload, status: form.status || "new" });
      setSaving(false);
      if (insertError) {
        if (insertError.code === "23505") setError("记录已存在");
        else if (insertError.code === "42P01") setError("数据库表不存在，请先执行迁移");
        else setError(insertError.message);
        return;
      }
    }
    setForm(EMPTY);
    setOpen(false);
    if (onSuccess) onSuccess();
    router.refresh();
  }

  const title = isEdit ? "编辑客户" : "添加客户";
  const desc = isEdit ? "修改客户信息" : "输入客户信息或上传证件照片自动识别";

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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 pb-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && !ocrLoading && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="上传图片识别" disabled={ocrLoading || saving} onClick={() => fileRef.current?.click()}>
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
                  <Loader2 className="size-4 animate-spin" /> AI 正在识别中...
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: 基础信息 */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">基础信息</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel required>姓名</FieldLabel>
                      <Input placeholder="客户姓名" value={form.name} onChange={(e) => setField("name", e.target.value)} disabled={saving} autoFocus />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>邮箱</FieldLabel>
                      <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>电话</FieldLabel>
                      <Input placeholder="+86 138-0000-0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>微信</FieldLabel>
                      <Input placeholder="微信号" value={form.wechat} onChange={(e) => setField("wechat", e.target.value)} disabled={saving} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>身份证号</FieldLabel>
                    <Input placeholder="身份证号码" value={form.id_card} onChange={(e) => setField("id_card", e.target.value)} disabled={saving} />
                  </div>
                </div>

                {/* Section 2: Demand */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">客户需求</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel>客户类型</FieldLabel>
                      <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.customer_type} onChange={(e) => setField("customer_type", e.target.value)} disabled={saving}>
                        <option value="">-- 请选择 --</option>
                        <option value="buyer">买房</option>
                        <option value="renter">租房</option>
                        <option value="both">买卖均可</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>意向类型</FieldLabel>
                      <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.property_type_pref} onChange={(e) => setField("property_type_pref", e.target.value)} disabled={saving}>
                        <option value="">-- 请选择 --</option>
                        <option value="apartment">住宅</option>
                        <option value="villa">别墅</option>
                        <option value="loft">复式</option>
                        <option value="cottage">洋房</option>
                        <option value="commercial">商业</option>
                        <option value="shop">商铺</option>
                        <option value="office">写字楼</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>最低预算（万）</FieldLabel>
                      <Input type="number" placeholder="最低预算" value={form.budget_min} onChange={(e) => setField("budget_min", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>最高预算（万）</FieldLabel>
                      <Input type="number" placeholder="最高预算" value={form.budget_max} onChange={(e) => setField("budget_max", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>意向居室</FieldLabel>
                      <Input type="number" placeholder="如 3" value={form.bedrooms_pref} onChange={(e) => setField("bedrooms_pref", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>最小面积（㎡）</FieldLabel>
                      <Input type="number" placeholder="最小面积" value={form.area_min} onChange={(e) => setField("area_min", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>最大面积（㎡）</FieldLabel>
                      <Input type="number" placeholder="最大面积" value={form.area_max} onChange={(e) => setField("area_max", e.target.value)} disabled={saving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <FieldLabel>意向城市</FieldLabel>
                      <Input placeholder="城市" value={form.target_city} onChange={(e) => setField("target_city", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>意向区域</FieldLabel>
                      <Input placeholder="区域" value={form.target_district} onChange={(e) => setField("target_district", e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>意向小区</FieldLabel>
                      <Input placeholder="小区" value={form.target_community} onChange={(e) => setField("target_community", e.target.value)} disabled={saving} />
                    </div>
                  </div>
                </div>

                {/* Section 3: 管理信息 */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">管理信息</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <FieldLabel>状态</FieldLabel>
                      <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={saving}>
                        <option value="new">新客户</option>
                        <option value="contacting">沟通中</option>
                        <option value="viewing">带看中</option>
                        <option value="deal">已成交</option>
                        <option value="closed">已关闭</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>来源</FieldLabel>
                      <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.source} onChange={(e) => setField("source", e.target.value)} disabled={saving}>
                        <option value="">-- 请选择 --</option>
                        <option value="wechat">微信</option>
                        <option value="phone">电话</option>
                        <option value="store">门店</option>
                        <option value="referral">转介绍</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>负责人</FieldLabel>
                      <Input placeholder="负责人姓名" value={form.manager} onChange={(e) => setField("manager", e.target.value)} disabled={saving} />
                    </div>
                  </div>
                </div>

                {/* Section 4: 备注 */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">备注</div>
                  <textarea
                    className="h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-y"
                    placeholder="备注信息..."
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    disabled={saving}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                )}

                <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card py-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>取消</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin mr-1" />}
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

export function AddCustomerButton() {
  return <CustomerForm mode="add" />;
}
