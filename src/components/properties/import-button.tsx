"use client";

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Link from "next/link";

export function ImportButton() {
  return (
    <Button variant="outline" asChild>
      <Link href="/properties/import">
        <Upload className="size-4" />
        Import
      </Link>
    </Button>
  );
}
