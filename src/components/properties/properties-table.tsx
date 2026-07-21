"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { PropertyForm } from "@/components/properties/property-form";
import { Loader2, Pencil, Search, Trash2, X, Filter, Home } from "lucide-react";
import type { PropertyWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  vacant:      { label: "空置",  variant: "secondary" },
  occupied:    { label: "已租",  variant: "default" },
  sold:        { label: "已售",  variant: "default" },
  maintenance: { label: "维护中", variant: "destructive" },
  pending:     { label: "待处理", variant: "outline" },
};

const TYPE_MAP: Record<string, string> = {
  apartment: "公寓", villa: "别墅", loft: "Loft", cottage: "平房",
  commercial: "商铺", shop: "门店", office: "写字楼",
};

const LISTING_LABEL: Record<string, string> = { rent: "出租", sale: "出售" };

type FilterState = {
  listingType: string; minPrice: string; maxPrice: string; minBedrooms: string;
  decoration: string; hasElevator: string;
};

const EMPTY_FILTER: FilterState = { listingType: "", minPrice: "", maxPrice: "", minBedrooms: "", decoration: "", hasElevator: "" };

function formatRent(rent: number): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rent);
}

function formatPrice(property: PropertyWithDetails): string {
  if (property.listing_type === "sale" && property.sale_price != null) return (property.sale_price / 10000).toFixed(0) + "万";
  if (property.rent_price != null) return formatRent(property.rent_price);
  return property.rent != null ? formatRent(property.rent) : "—";
}

function roomLabel(p: PropertyWithDetails): string {
  const parts: string[] = [];
  if (p.bedrooms != null && p.bedrooms > 0) parts.push(p.bedrooms + "室");
  if (p.living_rooms != null && p.living_rooms > 0) parts.push(p.living_rooms + "厅");
  if (p.bathrooms != null && p.bathrooms > 0) parts.push(p.bathrooms + "卫");
  return parts.length > 0 ? parts.join("") : "—";
}

function floorLabel(p: PropertyWithDetails): string {
  if (p.floor == null) return "—";
  let label = String(p.floor);
  if (p.total_floors != null) label += "/" + p.total_floors;
  if (p.has_elevator) label += " 电梯";
  return label;
}

interface Props { initialData: PropertyWithDetails[]; }

export function PropertiesTable({ initialData }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [deleteTarget, setDeleteTarget] = useState<PropertyWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<PropertyWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  const filtered = initialData.filter((p) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q) && !(p.community && p.community.toLowerCase().includes(q)) && !(p.owner_name && p.owner_name.toLowerCase().includes(q))) return false;
    }
    if (filters.listingType && p.listing_type !== filters.listingType) return false;
    if (filters.decoration && p.decoration !== filters.decoration) return false;
    if (filters.hasElevator === "true" && !p.has_elevator) return false;
    if (filters.hasElevator === "false" && p.has_elevator !== false) return false;
    if (filters.minBedrooms) { const mb = parseInt(filters.minBedrooms); if (!isNaN(mb) && (p.bedrooms == null || p.bedrooms < mb)) return false; }
    const price = p.listing_type === "sale" ? (p.sale_price ?? 0) : (p.rent_price ?? p.rent ?? 0);
    if (filters.minPrice) { const v = parseFloat(filters.minPrice); if (!isNaN(v) && price < v) return false; }
    if (filters.maxPrice) { const v = parseFloat(filters.maxPrice); if (!isNaN(v) && price > v) return false; }
    return true;
  });

  function setFilter(field: keyof FilterState, value: string) { setFilters(prev => ({ ...prev, [field]: value })); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error, data } = await supabase.from("properties").delete().eq("id", deleteTarget.id).select("id");
    setDeleting(false);
    if (error) { setToast({ type: "error", message: "删除失败：" + error.message }); }
    else if (!data || data.length === 0) { setToast({ type: "error", message: "删除失败：未能删除此记录" }); }
    else { setToast({ type: "success", message: "已删除房源“" + deleteTarget.name + "”" }); }
    setDeleteTarget(null); router.refresh();
  }

  return (
    <>
      <Card><CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><CardTitle>全部房源</CardTitle><div className="flex items-center gap-2"><div className="relative w-52"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input placeholder="搜索房源/小区/房东..." className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="size-3.5" />{activeFilterCount > 0 && <span className="ml-1 text-xs">({activeFilterCount})</span>}</Button></div></div><CardDescription>房源列表共 {filtered.length} 条{initialData.length !== filtered.length ? "（已筛选）" : ""}</CardDescription></CardHeader>
      {showFilters && (<div className="px-6 pb-3"><div className="flex flex-wrap gap-3 rounded-md border bg-muted/30 p-3"><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.listingType} onChange={(e) => setFilter("listingType", e.target.value)}><option value="">全部交易</option><option value="rent">出租</option><option value="sale">出售</option></select><Input type="number" placeholder="最低价格" className="h-8 w-28 text-xs" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} /><Input type="number" placeholder="最高价格" className="h-8 w-28 text-xs" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} /><Input type="number" placeholder="至少卧室" className="h-8 w-24 text-xs" value={filters.minBedrooms} min={1} onChange={(e) => setFilter("minBedrooms", e.target.value)} /><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.decoration} onChange={(e) => setFilter("decoration", e.target.value)}><option value="">全部装修</option><option value="furnished">精装</option><option value="standard">简装</option><option value="unfurnished">毛坯</option><option value="shell">清水房</option></select><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.hasElevator} onChange={(e) => setFilter("hasElevator", e.target.value)}><option value="">全部电梯</option><option value="true">有电梯</option><option value="false">无电梯</option></select>{activeFilterCount > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilters(EMPTY_FILTER)}>清除筛选</Button>}</div></div>)}
      <CardContent>{toast && (<div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}><span>{toast.message}</span><button onClick={() => setToast(null)}><X className="size-3.5" /></button></div>)}{filtered.length === 0 ? (<div className="py-12 text-center text-muted-foreground">{query.trim() || activeFilterCount > 0 ? <p>未找到匹配的房源</p> : <p>暂无房源。添加第一个房源开始吧。</p>}</div>) : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>房源</TableHead><TableHead>小区</TableHead><TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead>交易</TableHead><TableHead>价格</TableHead><TableHead>户型</TableHead><TableHead>面积</TableHead><TableHead>楼层</TableHead><TableHead className="w-24">操作</TableHead></TableRow></TableHeader><TableBody>{filtered.map((property) => { const status = STATUS_MAP[property.status] ?? { label: property.status, variant: "outline" as const }; return (<TableRow key={property.id}>
              <TableCell className="w-14 p-1">
                {property.primary_image_url ? (
                  <img src={property.primary_image_url} alt="" className="size-12 rounded object-cover" />
                ) : (
                  <div className="size-12 rounded bg-muted flex items-center justify-center">
                    <Home className="size-4 text-muted-foreground/40" />
                  </div>
                )}
              </TableCell>
              <TableCell><Link href={`/properties/${property.id}`} className="font-medium text-sm text-primary hover:underline">{property.name}</Link><div className="text-xs text-muted-foreground max-w-[180px] truncate">{property.address}</div></TableCell><TableCell className="text-sm text-muted-foreground">{property.community ?? "—"}</TableCell><TableCell className="text-sm text-muted-foreground">{TYPE_MAP[property.type] ?? property.type}</TableCell><TableCell><Badge variant={status.variant} className="text-xs">{status.label}</Badge></TableCell><TableCell className="text-sm">{LISTING_LABEL[property.listing_type] ?? property.listing_type}</TableCell><TableCell className="text-sm font-medium">{formatPrice(property)}</TableCell><TableCell className="text-sm text-muted-foreground">{roomLabel(property)}</TableCell><TableCell className="text-sm text-muted-foreground">{property.area != null ? property.area + "㎡" : "—"}</TableCell><TableCell className="text-sm text-muted-foreground">{floorLabel(property)}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" title="编辑" onClick={() => setEditTarget(property)}><Pencil className="size-4 text-muted-foreground hover:text-primary" /></Button><Button variant="ghost" size="icon" title="删除" onClick={() => setDeleteTarget(property)}><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></Button></div></TableCell></TableRow>); })}</TableBody></Table></div>)}</CardContent></Card>
      {editTarget && (<PropertyForm mode="edit" propertyId={editTarget.id} initialData={{ name: editTarget.name, address: editTarget.address ?? "", area: editTarget.area != null ? String(editTarget.area) : "",  listing_type: editTarget.listing_type ?? "rent", rent_price: editTarget.rent_price != null ? String(editTarget.rent_price) : "", sale_price: editTarget.sale_price != null ? String(editTarget.sale_price) : "",  type: editTarget.type ?? "apartment", city: editTarget.city ?? "", community: editTarget.community ?? "", decoration: editTarget.decoration ?? "", orientation: editTarget.orientation ?? "", floor: editTarget.floor != null ? String(editTarget.floor) : "", total_floors: editTarget.total_floors != null ? String(editTarget.total_floors) : "", has_elevator: editTarget.has_elevator ? "true" : "false", furniture: editTarget.furniture ?? "", year_built: editTarget.year_built != null ? String(editTarget.year_built) : "", property_rights: editTarget.property_rights ?? "", heating: editTarget.heating ?? "", parking: editTarget.parking ?? "", owner_name: editTarget.owner_name ?? "", owner_phone: editTarget.owner_phone ?? "", notes: editTarget.notes ?? "" }} trigger={<span />} onClose={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); setToast({ type: "success", message: "已更新房源“" + editTarget.name + "”" }); }} />)}
      {deleteTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} /><Card className="relative z-10 w-full max-w-sm shadow-xl"><CardHeader><CardTitle>确认删除</CardTitle><CardDescription>该操作不可撤销</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm">确定要删除房源“{deleteTarget.name}”吗？</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button><Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" />}删除</Button></div></CardContent></Card></div>)}
    </>
  );
}