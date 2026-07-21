import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Ruler, Building2, Thermometer, Car, Home, DollarSign, Eye } from "lucide-react";
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
  full: "拎包入住", partial: "部分家具", none: "空房",
};
const RIGHTS_MAP: Record<string, string> = {
  owned: "独立产权", mortgage: "按揭", shared: "共有", other: "其他", public: "公房", commercial: "商用", military: "军产",
};
const HEATING_MAP: Record<string, string> = {
  central: "集中供暖", floor: "地暖", radiator: "暖气片", ac: "空调供暖", none: "无供暖",
};
const PARKING_MAP: Record<string, string> = { yes: "有车位", no: "无车位", shared: "共用车位" };
const PAYMENT_MAP: Record<string, string> = {
  monthly: "月付", quarterly: "季付", halfyear: "半年付", yearly: "年付", negotiable: "面议",
};
const VIEWING_MAP: Record<string, string> = {
  anytime: "随时", appointment: "预约", weekend: "周末", key: "密码锁/钥匙",
};
const SOURCE_MAP: Record<string, string> = {
  "58": "58同城", beike: "贝壳", anjuke: "安居客", friend: "朋友介绍", walkin: "上门客户", owner: "房东直租", other: "其他",
};
const USAGE_MAP: Record<string, string> = {
  residential: "住宅", commercial: "商用", office: "办公", mixed: "商住两用",
};

const LISTING_LABEL: Record<string, string> = { rent: "出租", sale: "出售" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPrice(p: any): string {
  if (p.listing_type === "sale" && p.sale_price != null) {
    const sp = Number(p.sale_price);
    if (sp >= 10000) return (sp / 10000).toFixed(0) + "万";
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(sp);
  }
  const r = Number(p.rent_price ?? p.rent ?? 0);
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(r) + "/月";
}

interface FieldProps { label: string; value?: string | number | null; icon?: React.ReactNode; }
function FieldRow({ label, value, icon }: FieldProps) {
  if (value == null || value === "" || value === 0 || value === "0") return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground min-w-[60px]">{label}:</span>
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

  const status = STATUS_MAP[property.status ?? ""] ?? { label: property.status || "未知", variant: "outline" as const };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">
            <ArrowLeft className="size-4" />返回房源列表
          </Link>
        </Button>
      </div>

      {/* ── Image Gallery ────────────────────────────────── */}
      {images && images.length > 0 ? (
        <div className="grid gap-2 rounded-xl overflow-hidden">
          <div className="aspect-[16/9] bg-muted rounded-lg overflow-hidden">
            <img
              src={images.find((i) => i.is_primary)?.url || images[0].url}
              alt={property.name || ""}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={img.thumbnail_url || img.url}
                  alt=""
                  className="size-20 rounded-md object-cover border cursor-pointer hover:opacity-80"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[16/9] max-h-[300px] bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Home className="size-10 mx-auto mb-2 opacity-30" />
            <span className="text-sm">暂无图片</span>
          </div>
        </div>
      )}

      {/* ── Title + Status ───────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{property.name || "未命名"}</h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{property.address || "—"}</span>
          </div>
          {property.community && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              <span>{property.community}{property.building ? " " + property.building : ""}{property.unit_num ? " " + property.unit_num + "单元" : ""}{property.room_number ? " " + property.room_number : ""}</span>
            </div>
          )}
          {property.district && (
            <div className="mt-1 text-xs text-muted-foreground">{property.city || ""} {property.district}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="outline">{LISTING_LABEL[property.listing_type ?? ""] ?? property.listing_type}</Badge>
          <Badge variant="outline">{TYPE_MAP[property.type ?? ""] ?? property.type}</Badge>
        </div>
      </div>

      {/* ── Price ─────────────────────────────────────────── */}
      <div className="text-3xl font-bold text-primary">{formatPrice(property as unknown as Record<string, unknown>)}</div>

      {/* ── Key Stats Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">
            {property.bedrooms != null ? property.bedrooms + "室" : "—"}{property.living_rooms != null ? property.living_rooms + "厅" : ""}{property.bathrooms != null ? property.bathrooms + "卫" : ""}
          </div>
          <div className="text-xs text-muted-foreground">户型 {property.kitchens != null ? "· " + property.kitchens + "厨" : ""}{property.balconies != null && property.balconies > 0 ? "· " + property.balconies + "阳台" : ""}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{property.area != null ? property.area + "㎡" : "—"}</div>
          <div className="text-xs text-muted-foreground">面积</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">
            {property.floor != null ? property.floor : "—"}{property.total_floors != null ? "/" + property.total_floors + "层" : ""}
          </div>
          <div className="text-xs text-muted-foreground">楼层{property.has_elevator ? " · 有电梯" : ""}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{DECORATION_MAP[property.decoration ?? ""] ?? property.decoration ?? "—"}</div>
          <div className="text-xs text-muted-foreground">装修</div>
        </CardContent></Card>
      </div>

      {/* ── Detail Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Property Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">房屋信息</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <FieldRow label="朝向" value={property.orientation} icon={<Ruler className="size-3.5" />} />
            <FieldRow label="建造年份" value={property.year_built} icon={<Calendar className="size-3.5" />} />
            <FieldRow label="用途" value={USAGE_MAP[property.usage_type ?? ""] || property.usage_type} />
            <FieldRow label="家具" value={FURNITURE_MAP[property.furniture ?? ""]} />
            <FieldRow label="供暖" value={HEATING_MAP[property.heating ?? ""]} icon={<Thermometer className="size-3.5" />} />
            <FieldRow label="车位" value={PARKING_MAP[property.parking ?? ""]} icon={<Car className="size-3.5" />} />
          </CardContent>
        </Card>

        {/* Transaction Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">交易信息</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <FieldRow label="交易类型" value={LISTING_LABEL[property.listing_type ?? ""]} icon={<DollarSign className="size-3.5" />} />
            <FieldRow label="月租" value={property.rent_price != null ? "¥" + property.rent_price + "/月" : undefined} />
            <FieldRow label="售价" value={property.sale_price != null ? "¥" + property.sale_price : undefined} />
            <FieldRow label="付款方式" value={PAYMENT_MAP[property.payment_method ?? ""] || property.payment_method} />
            <FieldRow label="产权" value={RIGHTS_MAP[property.property_rights ?? ""] || property.property_rights} />
          </CardContent>
        </Card>

        {/* Location Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">位置信息</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <FieldRow label="城市" value={property.city} />
            <FieldRow label="区域" value={property.district} />
            <FieldRow label="小区" value={property.community} />
            <FieldRow label="栋" value={property.building} />
            <FieldRow label="单元" value={property.unit_num} />
            <FieldRow label="门牌" value={property.room_number} />
            <FieldRow label="地址" value={property.address} />
          </CardContent>
        </Card>

        {/* Management + Follow-up */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">管理与跟进</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <FieldRow label="房源编号" value={property.property_no} />
            <FieldRow label="来源" value={SOURCE_MAP[property.source ?? ""] || property.source} />
            <FieldRow label="负责人" value={property.manager} />
            <FieldRow label="房东" value={property.owner_name} />
            <FieldRow label="电话" value={property.owner_phone} />
            <FieldRow label="看房方式" value={VIEWING_MAP[property.viewing_method ?? ""] || property.viewing_method} icon={<Eye className="size-3.5" />} />
            <FieldRow label="最后跟进" value={property.last_follow_up_time} />
          </CardContent>
        </Card>
      </div>

      {/* Follow-up content */}
      {property.follow_up_content && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">跟进记录</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{property.follow_up_content}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {property.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">备注</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
