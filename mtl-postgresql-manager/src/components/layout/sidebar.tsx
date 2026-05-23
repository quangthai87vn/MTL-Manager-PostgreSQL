"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Users,
  Shield,
  Download,
  Upload,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/databases", label: "Cơ sở dữ liệu", icon: Database },
  { href: "/tables", label: "Tables", icon: Table2 },
  { href: "/users", label: "Người dùng", icon: Users },
  { href: "/permissions", label: "Phân quyền", icon: Shield },
  { href: "/backups", label: "Sao lưu", icon: Download },
  { href: "/restores", label: "Phục hồi", icon: Upload },
  { href: "/audit-logs", label: "Nhật ký", icon: History },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          {!collapsed && (
            <span className="font-bold text-lg">MTL Manager</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-slate-800">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Đăng xuất</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Đăng xuất</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
