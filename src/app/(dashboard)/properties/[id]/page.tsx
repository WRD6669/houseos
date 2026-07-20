import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Ruler, Building2, Wrench, Thermometer, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPropertyById, fetchPropertyImages } from "@/lib/supabase/data";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  vacant: { label: "空置", variant: "secondary" },
  occupied: { label: "已租", variant: "default" },
  sold: { label: "已售", variant: "default" },
  maintenance: { label: "维护中", variant: "destructive" },
  pending: { label: "待处理", variant: "outline" },
};

const TYPE_MAP: Record<string, string> = {
  apartment: "公寓", villa: "别墅", loft: "Loft", cottage: "平房",
  commercial: "商铺", shop: "门店", office: "写字楼",
};

const DECORATION_MAP: Record<string, string> = {
  furnished: "精装", standard: "简装", unfurnished: "毛坯", shell: "清水房",
};

const FURNITURE_MAP: Record<string, string> = {
  full: "掴包入住", partial: "部分家具", none: "空房",
};

const RIGHTS_MAP: Record<string, string> = {
  owned: "独立产权", mortgage: "按揭", shared: "共有", other: "其他",
};

const HEATING_MAP: Record<string, string> = {
  central: "集中供暖", floor: "地暖", radiator: "暖气片", ac: "空调供暖", none: "无供暖",
};

const PARKING_MAP: Record<string, string> = {
  yes: "有车位", no: "无车位", shared: "共用车位",
};

const LISTING_LABEL: Record<string, string> = { rent: "出租", sale: "出售" };

function formatPrice(p: { listing_type?: string; rent_price?: number | null; sale_price?: number | null; rent?: number }): string {
  if (p.listing_type === "sale" && p.sale_price != null) {
    if (p.sale_price >= 10000) return (p.sale_price / 10000).toFixed(0) + "万";
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(p.sale_price);
  }
  const r = p.rent_price ?? p.rent ?? 0;
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(r) + "/月";
}

function roomDesc(p: { bedrooms?: number | null; living_rooms?: number | null; bathrooms?: number | null }): string {
  const parts: string[] = [];
  if (p.bedrooms != null && p.bedrooms > 0) parts.push(p.bedrooms + "室");
  if (p.living_rooms != null && p.living_rooms > 0) parts.push(p.living_rooms + "厅");
  if (p.bathrooms != null && p.bathrooms > 0) parts.push(p.bathrooms + "卫");
  return parts.join("");
}

interface FieldRowProps { label: string; value?: string | number | null; icon?: React.ReactNode; }
function FieldRow({ label, value, icon }: FieldRowProps) {
  if (value == null || value === "" || value === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: property, error } = await fetchPropertyById(id);
  if (!property || error) notFound();

  const { data: images } = await fetchPropertyImages(id);

  const status = STATUS_MAP[property.status ?? ""] ?? { label: property.status, variant: "outline" as const };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">
            <ArrowLeft className="size-4" />
            返回房源列表
          </Link>
        </Button>
      </div>

      {/* Image Gallery */}
      {images && images.length > 0 && (
        <div className="grid gap-2 rounded-xl overflow-hidden">
          {/* Primary image large */}
          <div className="aspect-[16/9] bg-muted rounded-lg overflow-hidden">
            <img
              src={images.find((i) => i.is_primary)?.url || images[0].url}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={img.thumbnail_url || img.url}
                  alt=""
                  className="size-20 rounded-md object-cover border"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title + Status */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{property.address}</span>
          </div>
          {property.community && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              <span>{property.community}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="outline">{LISTING_LABEL[property.listing_type ?? ""] ?? property.listing_type}</Badge>
          <Badge variant="outline">{TYPE_MAP[property.type ?? ""] ?? property.type}</Badge>
        </div>
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-primary">
        {formatPrice(property)}
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{roomDesc(property) || "—"}</div>
            <div className="text-xs text-muted-foreground">户型</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{property.area != null ? property.area + "㎡" : "—"}</div>
            <div className="text-xs text-muted-foreground">面积</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {property.floor != null ? property.floor + (property.total_floors != null ? "/" + property.total_floors : "") + "层" : "—"}
            </div>
            <div className="text-xs text-muted-foreground">楼层{property.has_elevator ? " · 有电梯" : ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{DECORATION_MAP[property.decoration ?? ""] ?? property.decoration ?? "—"}</div>
            <div className="text-xs text-muted-foreground">装修</div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <FieldRow label="朝向" value={property.orientation} icon={<Ruler className="size-3.5" />} />
            <FieldRow label="建造年份" value={property.year_built} icon={<Calendar className="size-3.5" />} />
            <FieldRow label="家具" value={FURNITURE_MAP[property.furniture ?? ""]} icon={<Wrench className="size-3.5" />} />
            <FieldRow label="产权" value={RIGHTS_MAP[property.property_rights ?? ""]} />
            <FieldRow label="供暖" value={HEATING_MAP[property.heating ?? ""]} icon={<Thermometer className="size-3.5" />} />
            <FieldRow label="车位" value={PARKING_MAP[property.parking ?? ""]} icon={<Car className="size-3.5" />} />
          </CardContent>
        </Card>

        {/* Owner Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">业主信息</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <FieldRow label="姓名" value={property.owner_name} />
            <FieldRow label="电话" value={property.owner_phone} />
            {property.room_layout && (
              <FieldRow label="原始户型" value={property.room_layout} />
            )}
            {property.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">备注</p>
                <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
