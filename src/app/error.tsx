"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">页面出错了</h1>
          <p className="text-sm text-muted-foreground">
            发生未知错误，请重试。
          </p>
        </div>
        <Button onClick={reset} variant="default">
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    </div>
  );
}