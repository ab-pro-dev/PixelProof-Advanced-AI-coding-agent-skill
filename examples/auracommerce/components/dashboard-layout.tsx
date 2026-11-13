"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  BarChart3,
  Boxes,
  Tag,
  Star,
  Bell,
  Settings,
  UserCircle,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { ToastContainer } from "./ui/toast-container";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDark, toggleTheme, notifications, inventory, orders } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Unread notifications count
  const unreadCount = notifications.filter((n) => !n.read).length;
  // Low stock count
  const lowStockCount = inventory.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock").length;
  // Pending orders
  const pendingOrdersCount = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;

  const navItems: { group: string; items: NavItem[] }[] = [
    {
      group: "Operations",
      items: [
        { name: "Overview", href: "/", icon: LayoutDashboard },
        { name: "Products", href: "/products", icon: Package },
        { name: "Categories", href: "/categories", icon: FolderTree },
        {
          name: "Orders",
          href: "/orders",
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined,
          badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        },
        { name: "Customers", href: "/customers", icon: Users },
      ],
    },
    {
      group: "Management",
      items: [
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
        {
          name: "Inventory",
          href: "/inventory",
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
          badgeColor: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20",
        },
        { name: "Discounts", href: "/discounts", icon: Tag },
        { name: "Reviews", href: "/reviews", icon: Star },
        {
          name: "Notifications",
          href: "/notifications",
          icon: Bell,
          badge: unreadCount > 0 ? `${unreadCount}` : undefined,
          badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
        },
      ],
    },
    {
      group: "System",
      items: [
        { name: "Settings", href: "/settings", icon: Settings },
        { name: "Profile", href: "/profile", icon: UserCircle },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/" && (pathname === "/" || pathname === "/overview")) return true;
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* =========================================================================
          DESKTOP SIDEBAR
      ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card/70 backdrop-blur-xl transition-all duration-300 z-30 sticky top-0 h-screen select-none",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center shadow-sm shadow-amber-500/30 text-white shrink-0">
              <Sparkles className="w-5 h-5 fill-white/20 stroke-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight leading-tight flex items-center gap-1.5">
                  Aura Commerce
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pro
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">Admin Suite</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn("w-4 h-4 transition-transform duration-200", !sidebarCollapsed && "rotate-180")}
            />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />

                    {!sidebarCollapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Admin Quick Profile Footer */}
        <div className="p-3 border-t border-border bg-card/40">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/70 transition-colors group"
          >
            <div className="relative shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Admin avatar"
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate group-hover:text-foreground">Alex Vance</p>
                <p className="text-[11px] text-muted-foreground truncate">Super Admin</p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE DRAWER / SIDEBAR
      ========================================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 flex flex-col md:hidden shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-base">Aura Commerce</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {navItems.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    <p className="px-3 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
                      {group.group}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Alex Vance"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-xs font-semibold">Alex Vance</p>
                    <p className="text-[11px] text-muted-foreground">Super Admin</p>
                  </div>
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MAIN APPLICATION VIEW
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products, orders, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-1.5 text-xs rounded-lg bg-muted/60 border border-transparent focus:border-border focus:bg-background focus:outline-none transition-all placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden md:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground shadow-xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Store Pill */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Store Live & Syncing</span>
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors relative"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-card" />
                )}
              </button>

              <AnimatePresence>
                {notifDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setNotifDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 md:w-96 bg-card border border-border rounded-xl shadow-xl z-40 overflow-hidden"
                    >
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-bold tracking-tight">Recent Notifications</span>
                        <Link
                          href="/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          View All ({notifications.length})
                        </Link>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-border">
                        {notifications.slice(0, 4).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "p-3 text-xs hover:bg-muted/50 transition-colors flex gap-2.5 items-start",
                              !n.read && "bg-amber-500/5"
                            )}
                          >
                            <span className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              n.read ? "bg-muted-foreground/30" : "bg-amber-500"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{n.title}</p>
                              <p className="text-muted-foreground line-clamp-2 mt-0.5 text-[11px] leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                                {n.timestamp}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-2 border-t border-border bg-muted/30 text-center">
                        <Link
                          href="/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="text-xs font-medium text-foreground hover:text-amber-600 block py-1"
                        >
                          Go to Notification Center →
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Admin Avatar Chip */}
            <Link
              href="/profile"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-muted border border-border/80 transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Alex Vance"
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs font-semibold hidden sm:inline">Alex V.</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Global Toast Feed */}
      <ToastContainer />
    </div>
  );
}
