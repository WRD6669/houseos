import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Plus, Upload, Sparkles, Calendar, CheckCircle, DollarSign } from "lucide-react";
import { fetchDashboardStats, isSupabaseConfigured } from "@/lib/supabase/data";
import { Button } from "@/components/ui/button";

function formatPrice(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toLocaleString("zh-CN");
}

function formatArea(a: number | null): string {
  return a != null ? a + "㎡" : "-";
}

const STATUS_CN: Record<string, string> = {
  vacant: "空置", occupied: "已租", sold: "已售", maintenance: "维护", pending: "待处理",
};
const LISTING_CN: Record<string, string> = {
  rent: "出租", sale: "出售",
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">Supabase 未配置</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            请配置 <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> 中的 Supabase 环境变量
          </p>
        </div>
      </div>
    );
  }

  const { data: stats, error } = await fetchDashboardStats();

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">数据加载失败</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const s = stats!;
  const hasData = s.propertyCount > 0 || s.customerCount > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">欢迎回来，店长</h1>
          <p className="mt-1 text-blue-100">
            待跟进客户 <strong>{s.pendingFollowUps}</strong> 个 · 新增房源 <strong>{s.recentProperties?.length ?? 0}</strong> 套
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-blue-200">HouseOS</span>
          <p className="text-sm font-medium">智能房产管理系统</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日待带看</CardTitle>
            <Calendar className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.todayViewings}</div>
            <p className="text-xs text-muted-foreground">待跟进客户 {s.pendingFollowUps} 个</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本月成交</CardTitle>
            <CheckCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.monthlyDeals}</div>
            <p className="text-xs text-muted-foreground">带看中 {s.viewingCount} 个</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本月佣金</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.monthlyCommission > 0 ? "¥" + s.monthlyCommission.toLocaleString() : "暂无"}</div>
            <p className="text-xs text-muted-foreground">房源 {s.propertyCount} 套 · 客户 {s.customerCount} 个</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">房源总数</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.propertyCount}</div>
            <p className="text-xs text-muted-foreground">{s.vacantCount} 套空置 · 今日新增客户 {s.newCustomersToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Recent Properties + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Properties */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>最近新增房源</CardTitle>
            <CardDescription>最新录入的房源信息</CardDescription>
          </CardHeader>
          <CardContent>
            {!s.recentProperties || s.recentProperties.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Home className="mx-auto size-8 mb-2 opacity-50" />
                <p>暂无房源</p>
                <p className="text-xs mt-1">点击下方「AI 录入房源」开始使用</p>
              </div>
            ) : (
              <div className="space-y-3">
                {s.recentProperties.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{p.community || p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatArea(p.area)} · {STATUS_CN[p.status] || p.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">
                        {p.listing_type === "rent" ? "¥" + (p.rent_price != null ? formatPrice(p.rent_price) : "-") + "/月" : "¥" + (p.sale_price != null ? formatPrice(p.sale_price) : "-")}
                      </p>
                      <p className="text-xs text-muted-foreground">{LISTING_CN[p.listing_type] || p.listing_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>常用操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/properties/ai-text-import"><Sparkles className="size-4 mr-2" /> AI 录入房源</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/properties/import"><Upload className="size-4 mr-2" /> Excel 批量导入</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/customers"><Plus className="size-4 mr-2" /> 新增客户</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/properties"><Plus className="size-4 mr-2" /> 新增房源</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {s.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近动态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {s.recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    {item.target && <p className="text-xs text-muted-foreground">{item.target}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Home className="mx-auto size-10 mb-3 text-muted-foreground" />
          <h3 className="text-lg font-medium">欢迎使用 HouseOS</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            点击上方快捷入口开始添加房源和客户，或使用 AI 智能录入快速导入
          </p>
        </div>
      )}
    </div>
  );
}
