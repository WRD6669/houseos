import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, Users, TrendingUp } from "lucide-react";

const stats = [
  { label: "Total Revenue", value: ",231", change: "+20.1%", icon: DollarSign },
  { label: "Properties", value: "24", change: "+4", icon: Building2 },
  { label: "Customers", value: "156", change: "+12", icon: Users },
  { label: "Occupancy", value: "92%", change: "+2.4%", icon: TrendingUp },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your property management.</p>
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
                <span className="text-emerald-500">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New lease signed", property: "Sunset Apartments 4B", time: "2h ago" },
                { action: "Maintenance completed", property: "Green Valley Villa", time: "5h ago" },
                { action: "Payment received", property: "Downtown Loft 12A", time: "8h ago" },
                { action: "Viewing scheduled", property: "Lakeside Cottage", time: "1d ago" },
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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {["Add Property", "New Customer", "Create Lease", "Generate Report"].map((action) => (
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
