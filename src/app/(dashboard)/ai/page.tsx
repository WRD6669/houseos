import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles } from "lucide-react";

export default function AIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 助手</h1>
        <p className="text-sm text-muted-foreground">获取 AI 驱动的洞察和自动化建议。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">市场分析</CardTitle>
            <CardDescription>AI 驱动的房源市场趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Property values in your area have increased 8.3% this quarter. The AI recommends focusing on multi-family units.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">租金优化</CardTitle>
            <CardDescription>智能定价建议</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sunset Apartments 4B could yield ,650/month based on comparable listings (+10.4% increase).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">维修预测</CardTitle>
            <CardDescription>预防性维护提醒</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              3 properties are predicted to need HVAC service within 30 days. Schedule maintenance now.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            AI 对话
          </CardTitle>
          <CardDescription>Ask questions about your properties, customers, and market.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  你好！我是 HouseOS AI 助手，有什么可以帮您？
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Type your message..." className="flex-1" />
              <Button size="icon">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
