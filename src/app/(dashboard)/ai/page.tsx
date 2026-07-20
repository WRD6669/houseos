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
              您所在区域的房产价值本季度增长 8.3%，AI 建议重点关注多户住宅单元。
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
              落日公寓 4B 预计可达 ,650/月，基于同类房源对比（+10.4% 增长空间）。
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
              预测 3 处房源 30 天内需要暖通空调维修，请尽快安排维护。
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
          <CardDescription>向 AI 询问您的房源、客户和市场相关问题</CardDescription>
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
              <Input placeholder="输入您的问题..." className="flex-1" />
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