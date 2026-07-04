"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppSidebar } from "@/components/panel/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/lib/types";

export function PanelShell({
  children,
  title,
  description,
  roles = ["admin", "panwaslu"],
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  roles?: UserRole[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard roles={roles}>
      <div className="flex h-dvh min-w-0 overflow-hidden bg-background">
        <aside className="hidden h-full w-64 shrink-0 overflow-y-auto border-r border-sidebar-border md:block">
          <AppSidebar />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-start gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:items-center sm:px-4 md:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mt-0.5 shrink-0 md:hidden"
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,18rem)] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigasi</SheetTitle>
                </SheetHeader>
                <AppSidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </header>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
