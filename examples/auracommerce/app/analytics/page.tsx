"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingBag,
  Percent,
  Layers,
  Globe,
  PieChart as PieIcon,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useStore } from "@/lib/store-context";
import { REVENUE_CHART_DATA, FUNNEL_METRICS } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { isDark, addToast } = useStore();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "12m">("30d");

  const chartData = REVENUE_CHART_DATA[period];

  const categoryDistribution = [
    { name: "Luxury Timepieces", value: 168400, color: "#d97706" },
    { name: "Audio & Tech", value: 142100, color: "#6366f1" },
    { name: "Designer Apparel", value: 215300, color: "#10b981" },
    { name: "Minimalist Footwear", value: 94800, color: "#ec4899" },
    { name: "Leather Goods", value: 89500, color: "#f59e0b" },
    { name: "Home & Living", value: 64200, color: "#8b5cf6" },
  ];

  const regionalSales = [
    { region: "North America", share: 48, revenue: 371200 },
    { region: "Europe & UK", share: 32, revenue: 247400 },
    { region: "Asia-Pacific", share: 15, revenue: 115900 },
    { region: "Rest of World", share: 5, revenue: 38600 },
  ];

  const handleExport = () => {
    addToast({
      title: "Analytics Dossier Generated",
      description: "Full metrics and cohort analysis exported.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Intelligence & Sales Analytics
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              Executive View
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deep financial attribution, customer acquisition cohorts, funnel drop-off, and regional performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border text-xs font-medium">
            {(["7d", "30d", "90d", "12m"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  period === r
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Advanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Average Order Value (AOV)</span>
          <p className="text-2xl font-bold text-foreground mt-1">$89.87</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+4.5% from last month</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Customer Acquisition (CAC)</span>
          <p className="text-2xl font-bold text-foreground mt-1">$28.40</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>-12.8% CAC efficiency</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Return on Ad Spend (ROAS)</span>
          <p className="text-2xl font-bold text-foreground mt-1">4.82x</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Above 4.0x target</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Net Operating Margin</span>
          <p className="text-2xl font-bold text-foreground mt-1">38.4%</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Healthy luxury benchmark</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Revenue Area & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Revenue Trend Analysis</h2>
              <p className="text-xs text-muted-foreground">Net invoiced sales volume</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Period: {period.toUpperCase()}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="date" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} axisLine={false} />
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
                            Revenue: {formatCurrency(Number(payload[0]?.value || 0))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution (1 col) */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground">Category Contribution</h2>
            <p className="text-xs text-muted-foreground mb-3">Gross revenue distribution</p>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            {categoryDistribution.slice(0, 4).map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-muted-foreground truncate max-w-[130px]">{c.name}</span>
                </span>
                <span className="font-semibold text-foreground">{formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Section: Conversion Funnel & Regional Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Purchase Conversion Funnel</h2>
              <p className="text-xs text-muted-foreground">Session progression from visitor to purchaser</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              3.42% Final Rate
            </span>
          </div>

          <div className="space-y-4">
            {FUNNEL_METRICS.map((step, idx) => (
              <div key={idx} className="space-y-1.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">{step.stage}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(step.count)} ({step.rate}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                    style={{ width: `${step.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Performance */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Global Regional Distribution</h2>
              <p className="text-xs text-muted-foreground">International shipping destinations</p>
            </div>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            {regionalSales.map((r, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-1.5">
                <div className="flex justify-between items-center font-medium">
                  <span className="font-semibold text-foreground">{r.region}</span>
                  <span className="font-bold text-foreground">{formatCurrency(r.revenue)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${r.share}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Market Share</span>
                  <span className="font-semibold">{r.share}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
