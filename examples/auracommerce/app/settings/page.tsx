"use client";

import React, { useState } from "react";
import {
  Settings,
  Store,
  Palette,
  Bell,
  Truck,
  Shield,
  Save,
  Check,
  Sun,
  Moon,
  Laptop,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { isDark, toggleTheme, addToast } = useStore();

  const [activeTab, setActiveTab] = useState<"store" | "appearance" | "notifications" | "shipping">("store");

  // Form State
  const [storeInfo, setStoreInfo] = useState({
    name: "Aura Luxury Commerce",
    currency: "USD ($)",
    contactEmail: "concierge@auracommerce.com",
    phone: "+1 (800) 890-AURA",
    address: "One Market Plaza, Suite 3200, San Francisco, CA 94105",
    timezone: "America/Los_Angeles (PST - UTC-8)",
  });

  const [notificationsConfig, setNotificationsConfig] = useState({
    orderEmail: true,
    lowStockAlerts: true,
    fraudAlerts: true,
    weeklyReport: false,
    customerReviewNotifications: true,
  });

  const [shippingConfig, setShippingConfig] = useState({
    standardRate: 15,
    freeShippingThreshold: 150,
    taxRate: 8.5,
    internationalShipping: true,
    requireSignature: true,
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      title: "Store Settings Persisted",
      description: "Preferences and operational rules successfully updated.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Store Settings & Preferences
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure global store identity, regional taxation rules, automated dispatch policies, and visual preferences.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: "store", label: "Store Information", icon: Store },
          { id: "appearance", label: "Appearance & Theme", icon: Palette },
          { id: "notifications", label: "Alert Dispatches", icon: Bell },
          { id: "shipping", label: "Shipping & Taxes", icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 ${
                active
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Store Information */}
        {activeTab === "store" && (
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4 max-w-3xl text-xs">
            <h3 className="text-sm font-bold text-foreground">General Commerce Details</h3>
            <p className="text-muted-foreground text-xs">
              This information is displayed on invoices, automated notifications, and customer checkout receipts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-semibold block mb-1">Merchant Trading Name</label>
                <input
                  type="text"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Base Currency</label>
                <select
                  value={storeInfo.currency}
                  onChange={(e) => setStoreInfo({ ...storeInfo, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                >
                  <option value="USD ($)">USD — United States Dollar</option>
                  <option value="EUR (€)">EUR — Eurozone</option>
                  <option value="GBP (£)">GBP — British Pound</option>
                  <option value="JPY (¥)">JPY — Japanese Yen</option>
                  <option value="CHF">CHF — Swiss Franc</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Public Concierge Email</label>
                <input
                  type="email"
                  value={storeInfo.contactEmail}
                  onChange={(e) => setStoreInfo({ ...storeInfo, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Customer Support Hotline</label>
                <input
                  type="text"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Registered Headquarters Address</label>
              <textarea
                rows={2}
                value={storeInfo.address}
                onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Primary Operating Timezone</label>
              <input
                type="text"
                value={storeInfo.timezone}
                onChange={(e) => setStoreInfo({ ...storeInfo, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Appearance & Theme */}
        {activeTab === "appearance" && (
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-6 max-w-3xl text-xs">
            <div>
              <h3 className="text-sm font-bold text-foreground">Theme & Visual Mode</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Toggle between obsidian dark mode and crisp gallery light mode.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  if (isDark) toggleTheme();
                }}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  !isDark
                    ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                    : "border-border bg-muted/30 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Sun className="w-5 h-5 text-amber-500" />
                  {!isDark && <Check className="w-4 h-4 text-amber-500" />}
                </div>
                <div>
                  <p className="font-bold text-foreground">Gallery Light</p>
                  <p className="text-[11px] text-muted-foreground">High contrast day layout</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isDark) toggleTheme();
                }}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isDark
                    ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                    : "border-border bg-muted/30 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Moon className="w-5 h-5 text-amber-400" />
                  {isDark && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className="font-bold text-foreground">Obsidian Dark</p>
                  <p className="text-[11px] text-muted-foreground">Low eye-strain OLED theme</p>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-bold text-foreground mb-1">Color Accent Tone</h4>
              <p className="text-muted-foreground mb-3 text-[11px]">
                Brand highlight color for active states, indicators, and buttons.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { name: "Gold / Amber", hex: "#f59e0b", active: true },
                  { name: "Royal Indigo", hex: "#6366f1", active: false },
                  { name: "Emerald Luxe", hex: "#10b981", active: false },
                  { name: "Crimson Rose", hex: "#f43f5e", active: false },
                ].map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      addToast({
                        title: "Palette Selected",
                        description: `Activated ${color.name} palette.`,
                        type: "info",
                      });
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.hex }} />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alert Dispatches */}
        {activeTab === "notifications" && (
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4 max-w-3xl text-xs">
            <h3 className="text-sm font-bold text-foreground">Automated Notification Rules</h3>
            <p className="text-muted-foreground text-xs">
              Select which event triggers dispatch notifications to your administrator mobile app and email.
            </p>

            <div className="divide-y divide-border pt-2">
              {[
                {
                  id: "orderEmail",
                  title: "High-Value Transaction Notification",
                  description: "Send alert when an order value exceeds $500.00.",
                  checked: notificationsConfig.orderEmail,
                },
                {
                  id: "lowStockAlerts",
                  title: "Low Stock Inventory Depletion Alert",
                  description: "Notify immediately when any SKU inventory falls below 10 units.",
                  checked: notificationsConfig.lowStockAlerts,
                },
                {
                  id: "fraudAlerts",
                  title: "Fraud & Geolocation Risk Triggers",
                  description: "Flag suspicious IP addresses, velocity spikes, and high-risk cards.",
                  checked: notificationsConfig.fraudAlerts,
                },
                {
                  id: "customerReviewNotifications",
                  title: "Negative Customer Review Escalation",
                  description: "Instantly alert customer care when a 1 or 2 star review is submitted.",
                  checked: notificationsConfig.customerReviewNotifications,
                },
                {
                  id: "weeklyReport",
                  title: "Executive Monday Digest",
                  description: "Weekly executive PDF summary of revenues, margins, and customer cohort retention.",
                  checked: notificationsConfig.weeklyReport,
                },
              ].map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-foreground">{item.title}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">{item.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      setNotificationsConfig({
                        ...notificationsConfig,
                        [item.id]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping & Taxes */}
        {activeTab === "shipping" && (
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4 max-w-3xl text-xs">
            <h3 className="text-sm font-bold text-foreground">Logistics & Taxation Parameters</h3>
            <p className="text-muted-foreground text-xs">
              Configure checkout calculation rules for domestic, continental, and international deliveries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-semibold block mb-1">Standard Domestic Courier ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingConfig.standardRate}
                  onChange={(e) =>
                    setShippingConfig({ ...shippingConfig, standardRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Complimentary Shipping Threshold ($)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingConfig.freeShippingThreshold}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Estimated Sales Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={shippingConfig.taxRate}
                  onChange={(e) =>
                    setShippingConfig({ ...shippingConfig, taxRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingConfig.internationalShipping}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      internationalShipping: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <p className="font-semibold text-foreground">Accept International Orders (DDP)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically calculate customs and import duties at checkout.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingConfig.requireSignature}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      requireSignature: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <p className="font-semibold text-foreground">Mandatory Adult Signature on Luxury Delivery</p>
                  <p className="text-[11px] text-muted-foreground">
                    All orders exceeding $1,000 require in-person courier signature.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end max-w-3xl">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Store Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
