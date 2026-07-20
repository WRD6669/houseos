"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function AiImportButton() {
  return (
    <Button variant="outline" asChild>
      <Link href="/properties/ai-import">
        <Sparkles className="size-4" />
        AI 识别
      </Link>
    </Button>
  );
}
