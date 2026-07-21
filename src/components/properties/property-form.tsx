"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/properties/image-uploader";
import {
  Loader2, Plus, X, Home, MapPin, Building2, DollarSign,
  Users, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";

interface PropertyFormData {
  property_no: string; name: string; listing_type: string; status: string;
  source: string; manager: string;
  city: string; district: string; community: string; building: string;
  unit_num: string; room_number: string; address: string;
  type: string; usage_type: string; area: string;
  bedrooms: string; living_rooms: string; bathrooms: string;
  kitchens: string; balconies: string;
  decoration: string; orientation: string;
  floor: string; total_floors: string; has_elevator: string;
  furniture: string; year_built: string;
  rent_price: string; sale_price: string;
  payment_method: string; property_rights: string;
  heating: string; parking: string;
  owner_name: string; owner_phone: string;
  follow_up_content: string; last_follow_up_time: string; viewing_method: string;
  notes: string;
}

interface PropertyFormProps {
  mode?: "add" | "edit";
  initialData?: Partial<PropertyFormData>;
  propertyId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  onClose?: () => void;
}

const TABS = [
  { key: "basic", label: "基础信息", icon: "Home" },
  { key: "location", label: "位置信息", icon: "MapPin" },
  { key: "property", label: "房屋信息", icon: "Building2" },
  { key: "transaction", label: "交易信息", icon: "DollarSign" },
  { key: "followup", label: "跟进信息", icon: "Users" },
  { key: "notes", label: "备注", icon: "FileText" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY: PropertyFormData = {
  property_no: "", name: "", listing_type: "rent", status: "vacant",
  source: "", manager: "",
  city: "", district: "", community: "", building: "",
  unit_num: "", room_number: "", address: "",
  type: "apartment", usage_type: "", area: "",
  bedrooms: "", living_rooms: "", bathrooms: "",
  kitchens: "1", balconies: "0",
  decoration: "", orientation: "",
  floor: "", total_floors: "", has_elevator: "false",
  furniture: "", year_built: "",
  rent_price: "", sale_price: "",
  payment_method: "", property_rights: "",
  heating: "", parking: "",
  owner_name: "", owner_phone: "",
  follow_up_content: "", last_follow_up_time: "", viewing_method: "",
  notes: "",
};

const TYPE_OPTIONS: [string, string][] = [
  ["apartment", "公寓"], ["villa", "别墅"], ["loft", "Loft"],
  ["cottage", "平房"], ["commercial", "商铺"], ["shop", "门店"], ["office", "写字楼"],
];
const STATUS_OPTIONS: [string, string][] = [
  ["vacant", "空置"], ["occupied", "已租"], ["sold", "已售"],
  ["maintenance", "维护中"], ["pending", "待处理"],
];
const DECORATION_OPTIONS: [string, string][] = [
  ["", "未选择"], ["furnished", "精装"], ["standard", "简装"],
  ["unfurnished", "毛坯"], ["shell", "清水房"],
];
const FURNITURE_OPTIONS: [string, string][] = [
  ["", "未选择"], ["full", "掴包入住"], ["partial", "部分家具"], ["none", "空房"],
];
const RIGHTS_OPTIONS: [string, string][] = [
  ["", "未选择"], ["owned", "独立产权"], ["mortgage", "按揭"],
  ["shared", "共有"], ["other", "其他"],
  ["public", "公房"], ["commercial", "商用"], ["military", "军产"],
];
const HEATING_OPTIONS: [string, string][] = [
  ["", "未选择"], ["central", "集中供暖"], ["floor", "地暖"],
  ["radiator", "暖气片"], ["ac", "空调供暖"], ["none", "无供暖"],
];
const PARKING_OPTIONS: [string, string][] = [
  ["", "未选择"], ["yes", "有车位"], ["no", "无车位"], ["shared", "共用车位"],
];
const PAYMENT_OPTIONS: [string, string][] = [
  ["", "未选择"], ["monthly", "月付"], ["quarterly", "季付"],
  ["halfyear", "半年付"], ["yearly", "年付"], ["negotiable", "面议"],
];
const VIEWING_OPTIONS: [string, string][] = [
  ["", "未选择"], ["anytime", "随时"], ["appointment", "预约"],
  ["weekend", "周末"], ["key", "密码锁/钥匙"],
];
const SOURCE_OPTIONS: [string, string][] = [
  ["", "未选择"], ["58", "58同城"], ["beike", "贝壳"],
  ["anjuke", "安居客"], ["friend", "朋友介绍"],
  ["walkin", "上门客户"], ["owner", "房东直组"],
  ["other", "其他"],
];
const USAGE_OPTIONS: [string, string][] = [
  ["", "未选择"], ["residential", "住宅"], ["commercial", "商用"],
  ["office", "办公"], ["mixed", "商住两用"],
];

function SelectField({
  label, value, options, onChange, disabled,
}: {
  label: string; value: string; options: [string, string][];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function TextField({
  label, value, placeholder, type, onChange, disabled,
}: {
  label: string; value: string; placeholder?: string; type?: string;
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type || "text"}
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled}
      />
    </div>
  );
}

function tabIcon(key: TabKey) {
  const cls = "size-4";
  switch (key) {
    case "basic": return <Home className={cls} />;
    case "location": return <MapPin className={cls} />;
    case "property": return <Building2 className={cls} />;
    case "transaction": return <DollarSign className={cls} />;
    case "followup": return <Users className={cls} />;
    case "notes": return <FileText className={cls} />;
  }
}
export function PropertyForm({ mode = "add", initialData, propertyId, trigger, onSuccess, onClose }: PropertyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<import("@/lib/supabase/types").PropertyImage[]>([]);
  const [tab, setTab] = useState<TabKey>("basic");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit) {
      // Fetch full property data from DB when editing
      if (propertyId) {
        setOpen(true);
        const supabase = createClient();
        supabase.from("properties").select("*").eq("id", propertyId).single().then(({ data }) => {
          if (data) {
            const mapped: Partial<PropertyFormData> = {
              property_no: data.property_no ?? "",
              name: data.name ?? "",
              listing_type: data.listing_type ?? "rent",
              status: data.status ?? "vacant",
              source: data.source ?? "",
              manager: data.manager ?? "",
              city: data.city ?? "",
              district: data.district ?? "",
              community: data.community ?? "",
              building: data.building ?? "",
              unit_num: data.unit_num ?? "",
              room_number: data.room_number ?? "",
              address: data.address ?? "",
              type: data.type ?? "apartment",
              usage_type: data.usage_type ?? "",
              area: data.area != null ? String(data.area) : "",
              bedrooms: data.bedrooms != null ? String(data.bedrooms) : "",
              living_rooms: data.living_rooms != null ? String(data.living_rooms) : "",
              bathrooms: data.bathrooms != null ? String(data.bathrooms) : "",
              kitchens: data.kitchens != null ? String(data.kitchens) : "1",
              balconies: data.balconies != null ? String(data.balconies) : "0",
              decoration: data.decoration ?? "",
              orientation: data.orientation ?? "",
              floor: data.floor != null ? String(data.floor) : "",
              total_floors: data.total_floors != null ? String(data.total_floors) : "",
              has_elevator: data.has_elevator ? "true" : "false",
              furniture: data.furniture ?? "",
              year_built: data.year_built != null ? String(data.year_built) : "",
              rent_price: data.rent_price != null ? String(data.rent_price) : "",
              sale_price: data.sale_price != null ? String(data.sale_price) : "",
              payment_method: data.payment_method ?? "",
              property_rights: data.property_rights ?? "",
              heating: data.heating ?? "",
              parking: data.parking ?? "",
              owner_name: data.owner_name ?? "",
              owner_phone: data.owner_phone ?? "",
              follow_up_content: data.follow_up_content ?? "",
              last_follow_up_time: data.last_follow_up_time ?? "",
              viewing_method: data.viewing_method ?? "",
              notes: data.notes ?? "",
            };
            setForm({ ...EMPTY, ...mapped });
          }
        }, () => {
          // fallback to initialData
          // Load existing images for this property
          supabase.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true }).then(({ data: imgs }) => {
            if (imgs) setImages(imgs as typeof images);
          });
          if (initialData) {
            setForm({ ...EMPTY, ...initialData });
          }
        });
      } else if (initialData) {
        setOpen(true);
        setForm({ ...EMPTY, ...initialData });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof PropertyFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function nextTab() {
    const idx = TABS.findIndex((t) => t.key === tab);
    if (idx < TABS.length - 1) setTab(TABS[idx + 1].key);
  }
  function prevTab() {
    const idx = TABS.findIndex((t) => t.key === tab);
    if (idx > 0) setTab(TABS[idx - 1].key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("请输入房源名称"); return; }

    const isRent = form.listing_type !== "sale";

    const bedrooms = form.bedrooms ? parseInt(form.bedrooms) : null;
    const livingRooms = form.living_rooms ? parseInt(form.living_rooms) : null;
    const bathroomsVal = form.bathrooms ? parseInt(form.bathrooms) : null;
    const kitchensVal = form.kitchens ? parseInt(form.kitchens) : 1;
    const balconiesVal = form.balconies ? parseInt(form.balconies) : 0;

    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      property_no: form.property_no.trim() || null,
      name: form.name.trim(),
      listing_type: form.listing_type || "rent",
      status: form.status || "vacant",
      source: form.source || null,
      manager: form.manager.trim() || null,
      city: form.city || "",
      district: form.district.trim() || null,
      community: form.community.trim() || null,
      building: form.building.trim() || null,
      unit_num: form.unit_num.trim() || null,
      room_number: form.room_number.trim() || null,
      address: form.address.trim() || "",
      type: form.type || "apartment",
      usage_type: form.usage_type || null,
      area: form.area ? parseFloat(form.area) : null,
      bedrooms, living_rooms: livingRooms, bathrooms: bathroomsVal,
      kitchens: kitchensVal, balconies: balconiesVal,
      decoration: form.decoration || null,
      orientation: form.orientation.trim() || null,
      floor: form.floor ? parseInt(form.floor) : null,
      total_floors: form.total_floors ? parseInt(form.total_floors) : null,
      has_elevator: form.has_elevator === "true",
      furniture: form.furniture || null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      rent_price: isRent && form.rent_price ? parseFloat(form.rent_price) : null,
      sale_price: !isRent && form.sale_price ? parseFloat(form.sale_price) : null,
      rent: isRent && form.rent_price ? parseFloat(form.rent_price) : 0,
      payment_method: form.payment_method || null,
      property_rights: form.property_rights || null,
      heating: form.heating || null,
      parking: form.parking || null,
      owner_name: form.owner_name.trim() || null,
      owner_phone: form.owner_phone.trim() || null,
      follow_up_content: form.follow_up_content.trim() || null,
      last_follow_up_time: form.last_follow_up_time || null,
      viewing_method: form.viewing_method || null,
      notes: form.notes.trim() || null,
    };

    if (isEdit && propertyId) {
      const { error: updateError, data } = await supabase.from("properties").update(payload).eq("id", propertyId).select("id");
      setSaving(false);
      if (updateError) {
        if (updateError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移");
        else setError(updateError.message);
        return;
      }
      if (!data || data.length === 0) { setError("更新失败：未找到此记录"); return; }
      setOpen(false);
      router.refresh();
      onSuccess?.();
    } else {
      const { error: insertError } = await supabase.from("properties").insert(payload);
      setSaving(false);
      if (insertError) {
        if (insertError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移");
        else if (insertError.code === "23505") setError("房源编号已存在，请使用不同编号");
        else setError(insertError.message);
        return;
      }
      setOpen(false);
      router.refresh();
      onSuccess?.();
    }
  }

  const isRent = form.listing_type !== "sale";

  return (
    <>
      {!isEdit && trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : !isEdit ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />新增房源
        </Button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!saving) { setOpen(false); onClose?.(); } }} />
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>{isEdit ? "编辑房源" : "新增房源"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setOpen(false); onClose?.(); }} disabled={saving}>
                  <X className="size-4" />
                </Button>
              </div>
              <CardDescription>
                {isEdit ? "修改房源信息" : "填写房源详细信息"}
              </CardDescription>
            </CardHeader>

            <div className="flex border-b px-4 shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tabIcon(t.key)}
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1">
              {tab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="房源编号" value={form.property_no} placeholder="自动生成或手动输入" onChange={(v) => set("property_no", v)} disabled={saving} />
                    <TextField label="房源名称" value={form.name} placeholder="如：望京SOHO精装三室" onChange={(v) => set("name", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <SelectField label="交易类型" value={form.listing_type} options={[["rent", "出租"], ["sale", "出售"]]} onChange={(v) => set("listing_type", v)} disabled={saving} />
                    <SelectField label="房源状态" value={form.status} options={STATUS_OPTIONS} onChange={(v) => set("status", v)} disabled={saving} />
                    <SelectField label="来源" value={form.source} options={SOURCE_OPTIONS} onChange={(v) => set("source", v)} disabled={saving} />
                  </div>
                  <TextField label="负责人" value={form.manager} placeholder="负责中介姓名" onChange={(v) => set("manager", v)} disabled={saving} />
                </div>
              )}

              {tab === "location" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="城市" value={form.city} placeholder="如：北京" onChange={(v) => set("city", v)} disabled={saving} />
                    <TextField label="区域" value={form.district} placeholder="如：朝阳区" onChange={(v) => set("district", v)} disabled={saving} />
                  </div>
                  <TextField label="小区" value={form.community} placeholder="如：望京SOHO" onChange={(v) => set("community", v)} disabled={saving} />
                  <div className="grid grid-cols-3 gap-3">
                    <TextField label="栋" value={form.building} placeholder="如：3号楼" onChange={(v) => set("building", v)} disabled={saving} />
                    <TextField label="单元" value={form.unit_num} placeholder="如：1单元" onChange={(v) => set("unit_num", v)} disabled={saving} />
                    <TextField label="门牌" value={form.room_number} placeholder="如：301" onChange={(v) => set("room_number", v)} disabled={saving} />
                  </div>
                  <TextField label="详细地址" value={form.address} placeholder="完整地址" onChange={(v) => set("address", v)} disabled={saving} />
                </div>
              )}

              {tab === "property" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <SelectField label="房源类型" value={form.type} options={TYPE_OPTIONS} onChange={(v) => set("type", v)} disabled={saving} />
                    <SelectField label="用途" value={form.usage_type} options={USAGE_OPTIONS} onChange={(v) => set("usage_type", v)} disabled={saving} />
                    <TextField label="面积 (m²)" value={form.area} placeholder="如：120" type="number" onChange={(v) => set("area", v)} disabled={saving} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">户型拆分</label>
                    <div className="grid grid-cols-5 gap-2">
                      <TextField label="室" value={form.bedrooms} placeholder="0" type="number" onChange={(v) => set("bedrooms", v)} disabled={saving} />
                      <TextField label="厅" value={form.living_rooms} placeholder="0" type="number" onChange={(v) => set("living_rooms", v)} disabled={saving} />
                      <TextField label="卫" value={form.bathrooms} placeholder="0" type="number" onChange={(v) => set("bathrooms", v)} disabled={saving} />
                      <TextField label="厨" value={form.kitchens} placeholder="1" type="number" onChange={(v) => set("kitchens", v)} disabled={saving} />
                      <TextField label="阳台" value={form.balconies} placeholder="0" type="number" onChange={(v) => set("balconies", v)} disabled={saving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="装修" value={form.decoration} options={DECORATION_OPTIONS} onChange={(v) => set("decoration", v)} disabled={saving} />
                    <TextField label="朝向" value={form.orientation} placeholder="如：南北" onChange={(v) => set("orientation", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <TextField label="楼层" value={form.floor} placeholder="如：3" type="number" onChange={(v) => set("floor", v)} disabled={saving} />
                    <TextField label="总楼层" value={form.total_floors} placeholder="如：6" type="number" onChange={(v) => set("total_floors", v)} disabled={saving} />
                    <SelectField label="电梯" value={form.has_elevator} options={[["false", "无"], ["true", "有"]]} onChange={(v) => set("has_elevator", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="家具" value={form.furniture} options={FURNITURE_OPTIONS} onChange={(v) => set("furniture", v)} disabled={saving} />
                    <TextField label="建造年份" value={form.year_built} placeholder="如：2015" type="number" onChange={(v) => set("year_built", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="供暖" value={form.heating} options={HEATING_OPTIONS} onChange={(v) => set("heating", v)} disabled={saving} />
                    <SelectField label="车位" value={form.parking} options={PARKING_OPTIONS} onChange={(v) => set("parking", v)} disabled={saving} />
                  </div>
                </div>
              )}

              {tab === "transaction" && (
                <div className="space-y-4">
                  {isRent ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <TextField label="月租 (元)" value={form.rent_price} placeholder="如：8000" type="number" onChange={(v) => set("rent_price", v)} disabled={saving} />
                        <SelectField label="付款方式" value={form.payment_method} options={PAYMENT_OPTIONS} onChange={(v) => set("payment_method", v)} disabled={saving} />
                      </div>
                    </>
                  ) : (
                    <TextField label="售价 (元)" value={form.sale_price} placeholder="如：3500000" type="number" onChange={(v) => set("sale_price", v)} disabled={saving} />
                  )}
                  <SelectField label="产权" value={form.property_rights} options={RIGHTS_OPTIONS} onChange={(v) => set("property_rights", v)} disabled={saving} />
                </div>
              )}

              {tab === "followup" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="房东姓名" value={form.owner_name} placeholder="房东姓名" onChange={(v) => set("owner_name", v)} disabled={saving} />
                    <TextField label="房东电话" value={form.owner_phone} placeholder="138-0000-0000" onChange={(v) => set("owner_phone", v)} disabled={saving} />
                  </div>
                  <SelectField label="看房方式" value={form.viewing_method} options={VIEWING_OPTIONS} onChange={(v) => set("viewing_method", v)} disabled={saving} />
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">跟进内容</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      placeholder="跟进记录..." value={form.follow_up_content}
                      onChange={(e) => set("follow_up_content", e.target.value)} disabled={saving}
                    />
                  </div>
                  <TextField label="最后跟进时间" value={form.last_follow_up_time} placeholder="如：2025-01-15" type="date" onChange={(v) => set("last_follow_up_time", v)} disabled={saving} />
                </div>
              )}

              {tab === "notes" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">备注</label>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      placeholder="其他备注信息..." value={form.notes}
                      onChange={(e) => set("notes", e.target.value)} disabled={saving}
                    />
                  </div>
                  {isEdit && propertyId && (
                    <ImageUploader
                      propertyId={propertyId}
                      images={images}
                      onImagesChange={setImages}
                      disabled={saving}
                    />
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-1">
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={prevTab} disabled={tab === "basic" || saving}
                  >
                    <ChevronLeft className="size-4" />上一步
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={nextTab} disabled={tab === "notes" || saving}
                  >
                    下一步<ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); onClose?.(); }} disabled={saving}>
                    取消
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    保存
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

export function AddPropertyButton() { return <PropertyForm mode="add" />; }
