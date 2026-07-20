import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, FileText, Plus, TrendingUp, Users } from "lucide-react";
import { fetchDashboardStats, isSupabaseConfigured } from "@/lib/supabase/data";
import { Button } from "@/components/ui/button";

function formatMoney(n: number): string {
  if (n >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  return "¥" + n.toLocaleString("zh-CN");
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
          <p className="text-sm text-muted-foreground">房源管理概览</p>
        </div>
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
          <p className="text-sm text-muted-foreground">房源管理概览</p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-medium">数据加载失败</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
        <p className="text-sm text-muted-foreground">房源管理概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">月租金收入</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(s.totalMonthlyRent)}</div>
            <p className="text-xs text-muted-foreground">{s.occupiedCount} 套在租</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">房源总数</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.propertyCount}</div>
            <p className="text-xs text-muted-foreground">{s.vacantCount} 套空置</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">客户总数</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.customerCount}</div>
            <p className="text-xs text-muted-foreground">注册客户</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">出租率</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">{s.occupiedCount}/{s.propertyCount} 套</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>最近动态</CardTitle>
            <CardDescription>最新交易和更新</CardDescription>
          </CardHeader>
          <CardContent>
            {s.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无动态，开始添加数据吧</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/properties"><Plus className="size-4" /> 添加房源</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/customers"><Plus className="size-4" /> 新增客户</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/leases"><Plus className="size-4" /> 创建租约</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/leases"><FileText className="size-4" /> 查看租约</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}