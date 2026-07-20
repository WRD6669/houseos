import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1" />
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-8 h-9"
        />
      </div>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="size-4" />
        <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
      </Button>
    </header>
  );
}
