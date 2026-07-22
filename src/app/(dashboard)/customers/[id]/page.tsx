import { fetchCustomerById, matchPropertiesForCustomer, isSupabaseConfigured } from "@/lib/supabase/data";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScheduleViewingDialog from "@/components/customers/schedule-viewing-dialog";
import DealDialog from "@/components/customers/deal-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:     { label: "活跃",      variant: "default" },
  inactive:   { label: "非活跃",    variant: "outline" },
  pending:    { label: "待处理",    variant: "secondary" },
  new:        { label: "新客户",    variant: "default" },
  contacting: { label: "沟通中",    variant: "default" },
  viewing:    { label: "带看中",    variant: "default" },
  deal:       { label: "已成交",    variant: "default" },
  closed:     { label: "已关闭",    variant: "secondary" },
};

const RESULT_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "待看",      variant: "secondary" },
  satisfied: { label: "满意",      variant: "default" },
  thinking:  { label: "考虑中",    variant: "outline" },
  rejected:  { label: "不满意",    variant: "destructive" },
  deal:      { label: "成交",      variant: "default" },
};

const FOLLOWUP_TYPE_MAP: Record<string, string> = {
  call: "电话",
  wechat: "微信",
  visit: "带看",
  message: "短信",
  other: "其他",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return <div className="p-8 text-center">Supabase 未配置</div>;
  }

  const { data: customer, error } = await fetchCustomerById(id);
  const { data: matched } = await matchPropertiesForCustomer(id);

  if (error === "TABLES_NOT_FOUND") {
    return <div className="p-8 text-center">数据库表不存在，请执行迁移</div>;
  }
  if (error || !customer) {
    return <div className="p-8 text-center">客户不存在</div>;
  }

  const status = STATUS_MAP[customer.status] ?? { label: customer.status, variant: "outline" as const };
  const topMatches = (matched || []).slice(0, 5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followUps = (customer as any).follow_ups || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduledViewings = followUps.filter((f: any) => f.scheduled_at && f.result !== "deal");
  

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>客户信息</CardTitle>
            <CardDescription>联系方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" />
              <span>{customer.phone || "-"}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.wechat && <div className="text-sm"><span className="text-muted-foreground">微信：</span> {customer.wechat}</div>}
            <div className="text-sm"><span className="text-muted-foreground">类型：</span> {customer.customer_type || "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">来源：</span> {customer.source || "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">负责人：</span> {customer.manager || "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">创建时间：</span> {new Date(customer.created_at).toLocaleDateString("zh-CN")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>需求摘要</CardTitle>
            <CardDescription>房源需求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.target_city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                <span>{[customer.target_city, customer.target_district, customer.target_community].filter(Boolean).join(" / ")}</span>
              </div>
            )}
            <div className="text-sm"><span className="text-muted-foreground">意向类型：</span> {customer.property_type_pref || "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">居室需求：</span> {customer.bedrooms_pref != null ? String(customer.bedrooms_pref) : "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">面积需求：</span> {customer.area_min != null || customer.area_max != null ? (customer.area_min ?? "0") + "㎡" : "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">预算：</span> {customer.budget_min != null || customer.budget_max != null ? (customer.budget_min ?? "0") + " - " + (customer.budget_max ?? "0") + "万" : "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Viewings */}
      {scheduledViewings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>待看日程</CardTitle>
            <CardDescription>{scheduledViewings.length} 个待看安排</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {scheduledViewings.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="size-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {v.scheduled_at ? new Date(v.scheduled_at).toLocaleDateString("zh-CN") + " " + new Date(v.scheduled_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "时间待定"}
                      </p>
                      <p className="text-xs text-muted-foreground">{v.content}</p>
                    </div>
                  </div>
                  <Badge variant={RESULT_MAP[v.result]?.variant || "outline"}>
                    {RESULT_MAP[v.result]?.label || v.result || "待看"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched Properties */}
      {topMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>匹配房源</CardTitle>
            <CardDescription>需求匹配前 {topMatches.length} 套房源</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {topMatches.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link href={"/properties/" + p.id} className="font-medium hover:underline">
                        {p.community || p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {p.bedrooms}室 | {p.area || p.area_sqft}㎡
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-emerald-600">
                        {p.listing_type === "rent" ? "¥" + (p.rent_price ?? p.rent) + "/月" : "¥" + p.sale_price + "万"}
                      </span>
                      <Badge variant={p._matchScore >= 70 ? "default" : "secondary"}>
                        {p._matchScore}%
                      </Badge>
                    </div>
                  </div>
                  {p._matchReasons && (
                    <div className="flex flex-wrap gap-1">
                      {p._matchReasons.map((reason: string, ri: number) => (
                        <Badge key={ri} variant="outline" className="text-[10px]">{reason}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <ScheduleViewingDialog
                      customerId={customer.id}
                      propertyId={p.id}
                      propertyName={p.community || p.name}
                      manager={customer.manager || undefined}
                    />
                    <DealDialog
                      customerId={customer.id}
                      propertyId={p.id}
                      propertyName={p.community || p.name}
                      listingType={p.listing_type}
                      propertyPrice={p.listing_type === "rent" ? (p.rent_price ?? p.rent ?? 0) : (p.sale_price ?? 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Records */}
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
          <CardDescription>最近互动（{followUps.length} 条记录）</CardDescription>
        </CardHeader>
        <CardContent>
          {followUps.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {followUps.map((f: any) => (
                <div key={f.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{FOLLOWUP_TYPE_MAP[f.follow_up_type] || f.follow_up_type || "备注"}</Badge>
                      {f.result && RESULT_MAP[f.result] && (
                        <Badge variant={RESULT_MAP[f.result].variant}>{RESULT_MAP[f.result].label}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm">{f.content}</p>
                  {f.manager && <p className="text-xs text-muted-foreground mt-1">负责人：{f.manager}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无跟进记录</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
