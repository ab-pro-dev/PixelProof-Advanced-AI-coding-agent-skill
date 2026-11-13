"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  ShieldAlert,
  Boxes,
  Users,
  Check,
  Trash2,
  Filter,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { NotificationItem } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    addToast,
  } = useStore();

  const [selectedType, setSelectedType] = useState<string>("All");

  const filteredNotifications = notifications.filter(
    (n) => selectedType === "All" || n.type === selectedType
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeIcons = {
    order: <ShoppingBag className="w-4 h-4 text-emerald-500" />,
    stock: <Boxes className="w-4 h-4 text-amber-500" />,
    customer: <Users className="w-4 h-4 text-blue-500" />,
    security: <ShieldAlert className="w-4 h-4 text-red-500" />,
    system: <Bell className="w-4 h-4 text-purple-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            System activity alerts, inventory triggers, high-priority order dispatch notifications, and security logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {/* Categories Filter Strip */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex items-center gap-2 overflow-x-auto">
        {["All", "order", "stock", "customer", "security", "system"].map((type) => {
          const count =
            type === "All"
              ? notifications.length
              : notifications.filter((n) => n.type === type).length;
          const active = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all capitalize shrink-0 flex items-center gap-1.5 ${
                active
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>{type}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="rounded-xl bg-card border border-border shadow-xs divide-y divide-border overflow-hidden">
        {filteredNotifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 transition-colors flex items-start gap-4 ${
              n.read ? "hover:bg-muted/30" : "bg-amber-500/5 hover:bg-amber-500/10"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-muted/80 border border-border flex items-center justify-center shrink-0 mt-0.5">
              {typeIcons[n.type]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="text-muted-foreground/80">{n.timestamp}</span>

                {n.actionUrl && n.actionText && (
                  <Link
                    href={n.actionUrl}
                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{n.actionText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!n.read && (
                <button
                  onClick={() => markNotificationRead(n.id)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => deleteNotification(n.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title="Dismiss notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">Inbox Zero</p>
            <p className="text-xs mt-1">No pending notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
