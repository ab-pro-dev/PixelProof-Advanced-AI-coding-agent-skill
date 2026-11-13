"use client";

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Copy,
  Check,
  Calendar,
  Percent,
  DollarSign,
  Truck,
  Trash2,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { DiscountCoupon } from "@/lib/mock-data";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function DiscountsPage() {
  const { discounts, addDiscount, toggleDiscountStatus, deleteDiscount, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as DiscountCoupon["type"],
    value: 20,
    usageLimit: 500,
    minSpend: 100,
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    category: "All Categories",
    status: "Active" as DiscountCoupon["status"],
  });

  const filteredDiscounts = discounts.filter((d) => {
    const matchesSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || d.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({
      title: "Code Copied to Clipboard",
      description: `Promo code "${code}" ready for checkout.`,
      type: "info",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) return;

    addDiscount({
      ...formData,
      code: formData.code.toUpperCase().trim(),
      value: Number(formData.value),
      usageLimit: Number(formData.usageLimit),
      minSpend: Number(formData.minSpend),
    });

    setIsModalOpen(false);
    setFormData({
      code: "",
      type: "percentage",
      value: 20,
      usageLimit: 500,
      minSpend: 100,
      startDate: "2026-11-01",
      endDate: "2026-12-31",
      category: "All Categories",
      status: "Active",
    });
  };

  const statusBadge = (status: DiscountCoupon["status"]) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Scheduled":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Expired":
        return "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Promotions & Discounts
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {discounts.length} Active Campaigns
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure coupons, launch seasonal holiday promotions, and set discount thresholds.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coupon code or collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
          {["All", "Active", "Scheduled", "Expired"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                selectedStatus === status
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Coupon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDiscounts.map((coupon) => {
          const usagePercent = Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100));

          return (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider px-2.5 py-1 rounded-md bg-muted border border-border text-foreground">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      title="Copy promo code"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(coupon.status)}`}>
                    {coupon.status}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-xl font-bold text-foreground">
                    {coupon.type === "percentage" && `${coupon.value}% OFF`}
                    {coupon.type === "fixed" && `$${coupon.value} FLAT DISCOUNT`}
                    {coupon.type === "free_shipping" && `FREE EXPRESS SHIPPING`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Applies to: {coupon.category} • Min spend: {formatCurrency(coupon.minSpend)}
                  </p>
                </div>

                {/* Usage progress bar */}
                <div className="space-y-1.5 my-3 text-xs">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Campaign Redemptions</span>
                    <span className="font-semibold text-foreground">
                      {coupon.usageCount} / {coupon.usageLimit} ({usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Exp: {coupon.endDate}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleDiscountStatus(coupon.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors"
                  >
                    {coupon.status === "Active" ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteDiscount(coupon.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete coupon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredDiscounts.length === 0 && (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
          <Tag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-foreground">No promotions matched</p>
          <p className="text-xs mt-1">Try relaxing your search terms or status filter.</p>
        </div>
      )}

      {/* Create Coupon Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 text-card-foreground"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold">Create Promo Campaign</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. WINTERLUXURY25"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none font-mono uppercase font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Discount Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Dollar ($)</option>
                      <option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Discount Value</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Min. Order Spend ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minSpend}
                      onChange={(e) => setFormData({ ...formData, minSpend: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Redemption Cap</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
                  >
                    Launch Promo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
