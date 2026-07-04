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
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
          <div className="sticky top-0 h-screen">
            <AppSidebar />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigasi</SheetTitle>
                </SheetHeader>
                <AppSidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
