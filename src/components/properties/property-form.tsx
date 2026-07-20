"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { parseRoomLayout } from "@/lib/ai/room-parser";
import { ImageUploader } from "@/components/properties/image-uploader";
import { Loader2, Plus, X } from "lucide-react";

interface PropertyFormData {
  name: string; address: string; area: string; rooms: string;
  listing_type: string; rent_price: string; sale_price: string;
  type: string; city: string;
  community: string; decoration: string; orientation: string;
  floor: string; total_floors: string; has_elevator: string;
  furniture: string;
  year_built: string; property_rights: string; heating: string; parking: string;
  room_layout: string;
  owner_name: string; owner_phone: string; notes: string;
}

interface PropertyFormProps {
  mode?: "add" | "edit";
  initialData?: PropertyFormData;
  propertyId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const EMPTY: PropertyFormData = {
  name: "", address: "", area: "", rooms: "",
  listing_type: "rent", rent_price: "", sale_price: "",
  type: "apartment", city: "",
  community: "", decoration: "", orientation: "",
  floor: "", total_floors: "", has_elevator: "false",
  furniture: "", year_built: "", property_rights: "", heating: "", parking: "",
  room_layout: "", owner_name: "", owner_phone: "", notes: ""
};

const TYPES: [string, string][] = [
  ["apartment", "公寓"], ["villa", "别墅"], ["loft", "Loft"],
  ["cottage", "平房"], ["commercial", "商铺"], ["shop", "门店"], ["office", "写字楼"]
];
const DECORATION: [string, string][] = [
  ["", "未选择"], ["furnished", "精装"], ["standard", "简装"],
  ["unfurnished", "毛坯"], ["shell", "清水房"]
];

const PROPERTY_RIGHTS: [string, string][] = [
  ["", "未选择"], ["owned", "独立产权"], ["mortgage", "按揭"], ["shared", "共有"], ["other", "其他"]
];
const HEATING: [string, string][] = [
  ["", "未选择"], ["central", "集中供暖"], ["floor", "地暖"], ["radiator", "暖气片"], ["ac", "空调供暖"], ["none", "无供暖"]
];
const PARKING: [string, string][] = [
  ["", "未选择"], ["yes", "有车位"], ["no", "无车位"], ["shared", "共用车位"]
];

const FURNITURE: [string, string][] = [
  ["", "未选择"], ["full", "拎包入住"], ["partial", "部分家具"], ["none", "空房"]
];

export function PropertyForm({ mode = "add", initialData, propertyId, trigger, onSuccess }: PropertyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<import("@/lib/supabase/types").PropertyImage[]>([]);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit && initialData) {
      setOpen(true);
      const roomsDisplay = initialData.room_layout || initialData.rooms || "";
      setForm({ ...EMPTY, ...initialData, rooms: String(roomsDisplay) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof PropertyFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("请输入房源名称"); return; }
    if (!form.address.trim()) { setError("请输入地址"); return; }

    const roomResult = parseRoomLayout(form.rooms || null);
    const bedrooms = roomResult.bedrooms;
    const livingRooms = roomResult.livingRooms;
    const bathrooms = roomResult.bathrooms;
    const roomLayout = form.rooms?.trim() || null;
    const isRent = form.listing_type !== "sale";

    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      area: form.area ? parseFloat(form.area) : null,
      bedrooms, living_rooms: livingRooms, bathrooms,
      room_layout: roomLayout,
      listing_type: form.listing_type || "rent",
      rent_price: isRent && form.rent_price ? parseFloat(form.rent_price) : null,
      sale_price: !isRent && form.sale_price ? parseFloat(form.sale_price) : null,
      rent: isRent && form.rent_price ? parseFloat(form.rent_price) : 0,
      type: form.type || "apartment",
      city: form.city || "",
      community: form.community.trim() || null,
      decoration: form.decoration || null,
      orientation: form.orientation.trim() || null,
      floor: form.floor ? parseInt(form.floor) : null,
      total_floors: form.total_floors ? parseInt(form.total_floors) : null,
      has_elevator: form.has_elevator === "true",
      furniture: form.furniture || null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      property_rights: form.property_rights || null,
      heating: form.heating || null,
      parking: form.parking || null,
      owner_name: form.owner_name.trim() || null,
      owner_phone: form.owner_phone.trim() || null,
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
    } else {
      const { error: insertError, data } = await supabase.from("properties").insert({ ...payload, status: "vacant" }).select("id");
      setSaving(false);
      if (insertError) {
        if (insertError.code === "42P01") setError("数据库表不存在，请先执行 SQL 迁移");
        else setError(insertError.message);
        return;
      }
      if (!data || data.length === 0) { setError("添加失败：未收到数据库确认"); return; }
    }
    setForm(EMPTY); setOpen(false);
    if (onSuccess) onSuccess();
    router.refresh();
  }

  const title = isEdit ? "编辑房源" : "添加房源";
  const desc = isEdit ? "修改房源信息" : "填写以下房源信息";
  const isRent = form.listing_type !== "sale";

  return (
    <>
      {trigger ? (<div onClick={() => setOpen(true)}>{trigger}</div>) : (
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> 添加房源</Button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[2vh] overflow-y-auto">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-xl my-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></div>
              <Button variant="ghost" size="icon" onClick={() => !saving && setOpen(false)}><X className="size-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Name + Listing Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">名称 <span className="text-destructive">*</span></label>
                    <Input placeholder="如：十四佳园 1-3-301" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} autoFocus />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">交易类型</label>
                    <div className="flex gap-2">
                      <Button type="button" variant={isRent ? "default" : "outline"} size="sm" className="flex-1" onClick={() => set("listing_type", "rent")}>出租</Button>
                      <Button type="button" variant={!isRent ? "default" : "outline"} size="sm" className="flex-1" onClick={() => set("listing_type", "sale")}>出售</Button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isRent ? "月租 (元)" : "售价 (万元)"}</label>
                  {isRent ? (
                    <Input type="number" placeholder="如：8000" value={form.rent_price} onChange={(e) => set("rent_price", e.target.value)} disabled={saving} />
                  ) : (
                    <Input type="number" placeholder="如：350" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} disabled={saving} />
                  )}
                </div>

                {/* Row 3: Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">地址 <span className="text-destructive">*</span></label>
                  <Input placeholder="详细地址" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={saving} />
                </div>

                {/* Row 4: Type + City */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">类型</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.type} onChange={(e) => set("type", e.target.value)} disabled={saving}>
                      {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">城市</label>
                    <Input placeholder="如：北京" value={form.city} onChange={(e) => set("city", e.target.value)} disabled={saving} />
                  </div>
                </div>

                {/* Row 5: Community + Area */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">小区</label>
                    <Input placeholder="小区名称" value={form.community} onChange={(e) => set("community", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">面积 (㎡)</label>
                    <Input type="number" placeholder="如：120" value={form.area} onChange={(e) => set("area", e.target.value)} disabled={saving} />
                  </div>
                </div>

                {/* Row 6: Rooms */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">户型</label>
                  <Input placeholder="如：三室两厅一卫 或 3-2-1" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} disabled={saving} />
                </div>

                {/* Row 7: Decoration + Orientation */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">装修</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.decoration} onChange={(e) => set("decoration", e.target.value)} disabled={saving}>
                      {DECORATION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">朝向</label>
                    <Input placeholder="如：南北" value={form.orientation} onChange={(e) => set("orientation", e.target.value)} disabled={saving} />
                  </div>
                </div>

                {/* Row 8: Floor / Total Floors / Elevator */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">楼层</label>
                    <Input type="number" placeholder="如：3" value={form.floor} onChange={(e) => set("floor", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">总楼层</label>
                    <Input type="number" placeholder="如：6" value={form.total_floors} onChange={(e) => set("total_floors", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">电梯</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.has_elevator} onChange={(e) => set("has_elevator", e.target.value)} disabled={saving}>
                      <option value="false">无</option>
                      <option value="true">有</option>
                    </select>
                  </div>
                </div>

                {/* Row 9: Furniture */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">家具</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.furniture} onChange={(e) => set("furniture", e.target.value)} disabled={saving}>
                    {FURNITURE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>

                
                {/* Row 9b: Year Built + Property Rights */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">建造年份</label>
                    <Input type="number" placeholder="如：2015" value={form.year_built} onChange={(e) => set("year_built", e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">产权</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.property_rights} onChange={(e) => set("property_rights", e.target.value)} disabled={saving}>
                      {PROPERTY_RIGHTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 9c: Heating + Parking */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">供暖</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.heating} onChange={(e) => set("heating", e.target.value)} disabled={saving}>
                      {HEATING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">车位</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.parking} onChange={(e) => set("parking", e.target.value)} disabled={saving}>
                      {PARKING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 10: Owner */}
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

                {/* Notes */}
{/* Images */}
                {isEdit && propertyId && (
                  <ImageUploader
                    propertyId={propertyId}
                    images={images}
                    onImagesChange={setImages}
                    disabled={saving}
                  />
                )}

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
