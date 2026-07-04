"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  GraduationCap,
  LogOut,
  Radio,
  Users,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/votes", label: "Verifikasi Suara", icon: CheckSquare },
  {
    href: "/dashboard/mahasiswa",
    label: "Mahasiswa",
    icon: GraduationCap,
    adminOnly: true,
  },
  { href: "/dashboard/paslon", label: "Paslon", icon: UsersRound, adminOnly: true },
  { href: "/dashboard/users", label: "Users", icon: Users, adminOnly: true },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAuth();

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-300">
          HIMATRIS
        </p>
        <h1 className="text-lg font-bold">Panel Panitia</h1>
        <p className="mt-1 text-xs text-sidebar-foreground/70">
          {user?.displayName} · {user?.role}
        </p>
      </div>
      <Separator className="shrink-0 bg-sidebar-border" />
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3">
        <Button
          asChild
          variant="secondary"
          className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
        >
          <Link href="/" onClick={onNavigate}>
            <Radio className="h-4 w-4" />
            Live Counting
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  );
}
