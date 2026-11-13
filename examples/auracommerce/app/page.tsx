"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Calendar,
  CreditCard,
  Plus,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useStore } from "@/lib/store-context";
import { REVENUE_CHART_DATA, CHANNEL_PERFORMANCE } from "@/lib/mock-data";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

export default function OverviewPage() {
  const { products, orders, customers, isDark, addToast } = useStore();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "12m">("7d");

  // Calculate dynamic stats
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0);
  const completedOrders = orders.filter((o) => o.status === "Delivered" || o.status === "Shipped").length;
  const recentOrders = orders.slice(0, 5);
  const topProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4);

  const kpis = [
    {
      title: "Total Revenue",
      value: formatCurrency(128430.5),
      change: "+14.2%",
      trend: "up",
      subtitle: "vs. previous month",
      icon: DollarSign,
      color: "from-amber-500/20 to-amber-500/5 text-amber-500",
    },
    {
      title: "Total Orders",
      value: formatNumber(1429),
      change: "+8.1%",
      trend: "up",
      subtitle: "vs. previous month",
      icon: ShoppingBag,
      color: "from-blue-500/20 to-blue-500/5 text-blue-500",
    },
    {
      title: "Active Customers",
      value: formatNumber(3892),
      change: "+12.4%",
      trend: "up",
      subtitle: "vs. previous month",
      icon: Users,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    },
    {
      title: "Conversion Rate",
      value: "3.42%",
      change: "+0.8%",
      trend: "up",
      subtitle: "vs. previous month",
      icon: Percent,
      color: "from-violet-500/20 to-violet-500/5 text-violet-500",
    },
  ];

  const currentChartData = REVENUE_CHART_DATA[timeRange];

  const handleExportData = () => {
    addToast({
      title: "Exporting Financial Summary",
      description: "CSV report downloaded to your device.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Operations Overview
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key commerce performance indicators, revenue trajectory, and immediate order fulfillment status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/products"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 rounded-xl bg-card border border-border hover:border-amber-500/40 transition-all shadow-xs group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.title}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2.5">
                <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    {kpi.change}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{kpi.subtitle}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Primary Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trajectory Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Revenue Analytics</h2>
              <p className="text-xs text-muted-foreground">Historical comparison vs. baseline period</p>
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start sm:self-auto text-xs font-medium">
              {(["7d", "30d", "90d", "12m"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    timeRange === range
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                <XAxis
                  dataKey="date"
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-3 rounded-lg bg-popover/95 backdrop-blur-md border border-border shadow-md text-xs">
                          <p className="font-semibold text-foreground mb-1">{label}</p>
                          <p className="text-amber-600 dark:text-amber-400 font-bold">
                            Current: {formatCurrency(Number(payload[0]?.value || 0))}
                          </p>
                          {payload[1] && (
                            <p className="text-muted-foreground">
                              Previous: {formatCurrency(Number(payload[1]?.value || 0))}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke={isDark ? "#475569" : "#cbd5e1"}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#previousGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-2 border-t border-border">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Current Period
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Baseline Comparison
              </span>
            </div>
            <Link href="/analytics" className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1">
              View Detailed Funnel →
            </Link>
          </div>
        </div>

        {/* Channel Breakdown Card */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">Traffic Channels</h2>
                <p className="text-xs text-muted-foreground">Sales attribution by source</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Last 30 Days
              </span>
            </div>

            <div className="space-y-3.5 mt-2">
              {CHANNEL_PERFORMANCE.map((channel, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{channel.channel}</span>
                    <span className="font-bold text-foreground">{formatCurrency(channel.sales)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${channel.percentage}%`,
                        backgroundColor: channel.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatNumber(channel.visitors)} visits</span>
                    <span>{channel.percentage}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Top Acquiring:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Direct Web (42%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Recent Orders</h2>
              <p className="text-xs text-muted-foreground">Incoming transactions needing dispatch</p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              All Orders ({orders.length}) →
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="pb-3 pl-1 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right pr-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const statusColors = {
                    Delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    Shipped: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                    Processing: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    Pending: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                    Cancelled: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                  };

                  return (
                    <tr key={order.id} className="hover:bg-muted/40 transition-colors group">
                      <td className="py-3 pl-1 font-mono font-semibold text-foreground">
                        <Link href="/orders" className="hover:text-amber-600 transition-colors">
                          {order.id}
                        </Link>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={order.customerAvatar}
                            alt={order.customerName}
                            className="w-6 h-6 rounded-full object-cover border border-border"
                          />
                          <span className="font-medium text-foreground">{order.customerName}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(order.date)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            statusColors[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 pr-1 text-right font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top-Selling Products (1 col) */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Top Selling Products</h2>
              <p className="text-xs text-muted-foreground">By total units shipped</p>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Catalog →
            </Link>
          </div>

          <div className="space-y-4">
            {topProducts.map((prod, idx) => (
              <div key={prod.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground/60 w-4 text-center">
                  #{idx + 1}
                </span>
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{prod.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{prod.category}</span>
                    <span>•</span>
                    <span className="font-mono">{formatCurrency(prod.price)}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-foreground">{prod.sales} sold</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatCurrency(prod.sales * prod.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
