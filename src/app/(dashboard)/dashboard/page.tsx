import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, Users, TrendingUp } from "lucide-react";

const stats = [
  { label: "总收入", value: ",231", change: "+20.1%", icon: DollarSign },
  { label: "房源", value: "24", change: "+4", icon: Building2 },
  { label: "客户", value: "156", change: "+12", icon: Users },
  { label: "入住率", value: "92%", change: "+2.4%", icon: TrendingUp },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
        <p className="text-sm text-muted-foreground">房源管理概览</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500">{stat.change}</span> 较上月
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>最近动态</CardTitle>
            <CardDescription>最新交易和更新</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "新签租约", property: "落日公寓 4B", time: "2小时前" },
                { action: "维修完成", property: "绿谷别墅", time: "5小时前" },
                { action: "收到付款", property: "市中心 Loft 12A", time: "8小时前" },
                { action: "已安排看房", property: "湖畔小屋", time: "1天前" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.property}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {["添加房源", "新增客户", "创建租约", "生成报表"].map((action) => (
              <div
                key={action}
                className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                {action}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}