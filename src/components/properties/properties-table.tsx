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
import { Loader2, Pencil, Search, Trash2, X, Filter, Eye } from "lucide-react";
import type { PropertyWithDetails } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  vacant:      { label: "\u7a7a\u7f6e",  variant: "secondary" },
  occupied:    { label: "\u5df2\u79df",  variant: "default" },
  sold:        { label: "\u5df2\u552e",  variant: "default" },
  maintenance: { label: "\u7ef4\u62a4\u4e2d", variant: "destructive" },
  pending:     { label: "\u5f85\u5904\u7406", variant: "outline" },
};

const TYPE_MAP: Record<string, string> = {
  apartment: "\u516c\u5bd3", villa: "\u522b\u5885", loft: "Loft", cottage: "\u5e73\u623f",
  commercial: "\u5546\u94fa", shop: "\u95e8\u5e97", office: "\u5199\u5b57\u697c",
};

const LISTING_LABEL: Record<string, string> = { rent: "\u51fa\u79df", sale: "\u51fa\u552e" };

type FilterState = {
  listingType: string; minPrice: string; maxPrice: string; minBedrooms: string;
  decoration: string; hasElevator: string;
};

const EMPTY_FILTER: FilterState = { listingType: "", minPrice: "", maxPrice: "", minBedrooms: "", decoration: "", hasElevator: "" };

function formatRent(rent: number): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rent);
}

function formatPrice(property: PropertyWithDetails): string {
  if (property.listing_type === "sale" && property.sale_price != null) return (property.sale_price / 10000).toFixed(0) + "\u4e07";
  if (property.rent_price != null) return formatRent(property.rent_price);
  return property.rent != null ? formatRent(property.rent) : "\u2014";
}

function roomLabel(p: PropertyWithDetails): string {
  const parts: string[] = [];
  if (p.bedrooms != null && p.bedrooms > 0) parts.push(p.bedrooms + "\u5ba4");
  if (p.living_rooms != null && p.living_rooms > 0) parts.push(p.living_rooms + "\u5385");
  if (p.bathrooms != null && p.bathrooms > 0) parts.push(p.bathrooms + "\u536b");
  return parts.length > 0 ? parts.join("") : "\u2014";
}

function floorLabel(p: PropertyWithDetails): string {
  if (p.floor == null) return "\u2014";
  let label = String(p.floor);
  if (p.total_floors != null) label += "/" + p.total_floors;
  if (p.has_elevator) label += " \u7535\u68af";
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
    if (error) { setToast({ type: "error", message: "\u5220\u9664\u5931\u8d25\uff1a" + error.message }); }
    else if (!data || data.length === 0) { setToast({ type: "error", message: "\u5220\u9664\u5931\u8d25\uff1a\u672a\u80fd\u5220\u9664\u6b64\u8bb0\u5f55" }); }
    else { setToast({ type: "success", message: "\u5df2\u5220\u9664\u623f\u6e90\u201c" + deleteTarget.name + "\u201d" }); }
    setDeleteTarget(null); router.refresh();
  }

  return (
    <>
      <Card><CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><CardTitle>\u5168\u90e8\u623f\u6e90</CardTitle><div className="flex items-center gap-2"><div className="relative w-52"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input placeholder="\u641c\u7d22\u623f\u6e90/\u5c0f\u533a/\u623f\u4e1c..." className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="size-3.5" />{activeFilterCount > 0 && <span className="ml-1 text-xs">({activeFilterCount})</span>}</Button></div></div><CardDescription>\u623f\u6e90\u5217\u8868\u5171 {filtered.length} \u6761{initialData.length !== filtered.length ? "\uff08\u5df2\u7b5b\u9009\uff09" : ""}</CardDescription></CardHeader>
      {showFilters && (<div className="px-6 pb-3"><div className="flex flex-wrap gap-3 rounded-md border bg-muted/30 p-3"><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.listingType} onChange={(e) => setFilter("listingType", e.target.value)}><option value="">\u5168\u90e8\u4ea4\u6613</option><option value="rent">\u51fa\u79df</option><option value="sale">\u51fa\u552e</option></select><Input type="number" placeholder="\u6700\u4f4e\u4ef7\u683c" className="h-8 w-28 text-xs" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} /><Input type="number" placeholder="\u6700\u9ad8\u4ef7\u683c" className="h-8 w-28 text-xs" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} /><Input type="number" placeholder="\u81f3\u5c11\u5367\u5ba4" className="h-8 w-24 text-xs" value={filters.minBedrooms} min={1} onChange={(e) => setFilter("minBedrooms", e.target.value)} /><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.decoration} onChange={(e) => setFilter("decoration", e.target.value)}><option value="">\u5168\u90e8\u88c5\u4fee</option><option value="furnished">\u7cbe\u88c5</option><option value="standard">\u7b80\u88c5</option><option value="unfurnished">\u6bdb\u576f</option><option value="shell">\u6e05\u6c34\u623f</option></select><select className="flex h-8 rounded-md border border-input bg-background px-2 text-xs" value={filters.hasElevator} onChange={(e) => setFilter("hasElevator", e.target.value)}><option value="">\u5168\u90e8\u7535\u68af</option><option value="true">\u6709\u7535\u68af</option><option value="false">\u65e0\u7535\u68af</option></select>{activeFilterCount > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilters(EMPTY_FILTER)}>\u6e05\u9664\u7b5b\u9009</Button>}</div></div>)}
      <CardContent>{toast && (<div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}><span>{toast.message}</span><button onClick={() => setToast(null)}><X className="size-3.5" /></button></div>)}{filtered.length === 0 ? (<div className="py-12 text-center text-muted-foreground">{query.trim() || activeFilterCount > 0 ? <p>\u672a\u627e\u5230\u5339\u914d\u7684\u623f\u6e90</p> : <p>\u6682\u65e0\u623f\u6e90\u3002\u6dfb\u52a0\u7b2c\u4e00\u4e2a\u623f\u6e90\u5f00\u59cb\u5427\u3002</p>}</div>) : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>\u623f\u6e90</TableHead><TableHead>\u5c0f\u533a</TableHead><TableHead>\u7c7b\u578b</TableHead><TableHead>\u72b6\u6001</TableHead><TableHead>\u4ea4\u6613</TableHead><TableHead>\u4ef7\u683c</TableHead><TableHead>\u6237\u578b</TableHead><TableHead>\u9762\u79ef</TableHead><TableHead>\u697c\u5c42</TableHead><TableHead className="w-24">\u64cd\u4f5c</TableHead></TableRow></TableHeader><TableBody>{filtered.map((property) => { const status = STATUS_MAP[property.status] ?? { label: property.status, variant: "outline" as const }; return (<TableRow key={property.id}><TableCell><Link href={`/properties/${property.id}`} className="font-medium text-sm text-primary hover:underline">{property.name}</Link><div className="text-xs text-muted-foreground max-w-[180px] truncate">{property.address}</div></TableCell><TableCell className="text-sm text-muted-foreground">{property.community ?? "\u2014"}</TableCell><TableCell className="text-sm text-muted-foreground">{TYPE_MAP[property.type] ?? property.type}</TableCell><TableCell><Badge variant={status.variant} className="text-xs">{status.label}</Badge></TableCell><TableCell className="text-sm">{LISTING_LABEL[property.listing_type] ?? property.listing_type}</TableCell><TableCell className="text-sm font-medium">{formatPrice(property)}</TableCell><TableCell className="text-sm text-muted-foreground">{roomLabel(property)}</TableCell><TableCell className="text-sm text-muted-foreground">{property.area != null ? property.area + "\u33a1" : "\u2014"}</TableCell><TableCell className="text-sm text-muted-foreground">{floorLabel(property)}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" title="\u7f16\u8f91" onClick={() => setEditTarget(property)}><Pencil className="size-4 text-muted-foreground hover:text-primary" /></Button><Button variant="ghost" size="icon" title="\u5220\u9664" onClick={() => setDeleteTarget(property)}><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></Button></div></TableCell></TableRow>); })}</TableBody></Table></div>)}</CardContent></Card>
      {editTarget && (<PropertyForm mode="edit" propertyId={editTarget.id} initialData={{ name: editTarget.name, address: editTarget.address ?? "", area: editTarget.area != null ? String(editTarget.area) : "", rooms: editTarget.room_layout ?? String(editTarget.rooms ?? ""), listing_type: editTarget.listing_type ?? "rent", rent_price: editTarget.rent_price != null ? String(editTarget.rent_price) : "", sale_price: editTarget.sale_price != null ? String(editTarget.sale_price) : "", room_layout: editTarget.room_layout ?? "", type: editTarget.type ?? "apartment", city: editTarget.city ?? "", community: editTarget.community ?? "", decoration: editTarget.decoration ?? "", orientation: editTarget.orientation ?? "", floor: editTarget.floor != null ? String(editTarget.floor) : "", total_floors: editTarget.total_floors != null ? String(editTarget.total_floors) : "", has_elevator: editTarget.has_elevator ? "true" : "false", furniture: editTarget.furniture ?? "", year_built: editTarget.year_built != null ? String(editTarget.year_built) : "", property_rights: editTarget.property_rights ?? "", heating: editTarget.heating ?? "", parking: editTarget.parking ?? "", owner_name: editTarget.owner_name ?? "", owner_phone: editTarget.owner_phone ?? "", notes: editTarget.notes ?? "" }} trigger={<span />} onSuccess={() => { setEditTarget(null); setToast({ type: "success", message: "\u5df2\u66f4\u65b0\u623f\u6e90\u201c" + editTarget.name + "\u201d" }); }} />)}
      {deleteTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} /><Card className="relative z-10 w-full max-w-sm shadow-xl"><CardHeader><CardTitle>\u786e\u8ba4\u5220\u9664</CardTitle><CardDescription>\u8be5\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm">\u786e\u5b9a\u8981\u5220\u9664\u623f\u6e90\u201c{deleteTarget.name}\u201d\u5417\uff1f</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>\u53d6\u6d88</Button><Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" />}\u5220\u9664</Button></div></CardContent></Card></div>)}
    </>
  );
}