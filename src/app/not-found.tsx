import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">页面不存在</h1>
          <p className="text-sm text-muted-foreground">
            您访问的页面不存在或已被移动。
          </p>
        </div>
        <Button variant="default" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            返回工作台
          </Link>
        </Button>
      </div>
    </div>
  );
}