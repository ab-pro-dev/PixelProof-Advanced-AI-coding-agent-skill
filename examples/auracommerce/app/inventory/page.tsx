"use client";

import React, { useState } from "react";
import {
  Boxes,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Minus,
  RotateCcw,
  PackageCheck,
  PackageX,
  Warehouse,
  CheckCircle2,
  X,
  Download,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { InventoryItem } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function InventoryPage() {
  const { inventory, adjustStock, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  // Adjustment Modal Form State
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("Supplier Restock");

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level inventory metrics
  const totalItems = inventory.reduce((acc, i) => acc + i.stock, 0);
  const totalValuation = inventory.reduce((acc, i) => acc + i.stock * i.unitCost, 0);
  const lowStockItems = inventory.filter((i) => i.status === "Low Stock");
  const outOfStockItems = inventory.filter((i) => i.status === "Out of Stock");

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustmentQty(item.stock);
    setAdjustmentReason("Supplier Restock");
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    adjustStock(adjustingItem.id, Number(adjustmentQty), adjustmentReason);
    setAdjustingItem(null);
  };

  const statusBadge = (status: InventoryItem["status"]) => {
    switch (status) {
      case "In Stock":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Low Stock":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Out of Stock":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Inventory & Warehousing
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {inventory.length} SKUs Monitored
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time warehouse stock levels, critical depletion alerts, unit cost valuations, and reordering.
          </p>
        </div>

        <button
          onClick={() => {
            addToast({
              title: "Warehouse Audit Exported",
              description: "inventory_valuation_audit.xlsx generated.",
              type: "success",
            });
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Inventory Valuation</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalValuation)}</p>
          <span className="text-[11px] text-muted-foreground">Across {totalItems} total units</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Healthy In-Stock SKUs</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {inventory.filter((i) => i.status === "In Stock").length}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Optimal turnover</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Low Stock Warnings</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {lowStockItems.length} SKUs
          </p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Under safety margin</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Depleted / Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {outOfStockItems.length} SKUs
          </p>
          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Requires immediate PO</span>
        </div>
      </div>

      {/* Low Stock Alert Strip */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">
                Action Required: {lowStockItems.length} items have dipped below reorder thresholds
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reorder recommendations have been flagged for supplier replenishment.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatus("Low Stock")}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
          >
            Filter Depleted Items
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
          {["All", "In Stock", "Low Stock", "Out of Stock"].map((status) => (
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

      {/* Inventory Table */}
      <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4">On Hand</th>
                <th className="py-3 px-4">Safety Limit</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                  <td className="py-3 px-4 text-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                      {item.location}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-foreground text-sm">{item.stock}</span>
                    <span className="text-muted-foreground text-[10px] ml-1">units</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{item.minThreshold} units</td>
                  <td className="py-3 px-4 font-mono font-semibold text-foreground">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 text-muted-foreground" />
                      <span>Adjust</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Boxes className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">No inventory items matched</p>
            <p className="text-xs mt-1">Check your search query or status filter.</p>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {adjustingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 text-card-foreground"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold">Adjust Warehouse Stock</h2>
                <button
                  onClick={() => setAdjustingItem(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} className="space-y-4 pt-4 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <img
                    src={adjustingItem.image}
                    alt={adjustingItem.productName}
                    className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                  />
                  <div>
                    <p className="font-bold text-foreground">{adjustingItem.productName}</p>
                    <p className="font-mono text-muted-foreground">{adjustingItem.sku}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Current: {adjustingItem.stock} units on hand
                    </p>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">New Total Units Count</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentQty((prev) => Math.max(0, prev - 1))}
                      className="p-2 rounded-lg border border-border hover:bg-muted"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      required
                      min="0"
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                      className="flex-1 px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none text-center font-bold text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustmentQty((prev) => prev + 1)}
                      className="p-2 rounded-lg border border-border hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Reason for Adjustment</label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  >
                    <option value="Supplier Restock">Supplier Restock Shipment</option>
                    <option value="Physical Cycle Audit">Physical Cycle Audit Correction</option>
                    <option value="Damaged or Defective">Damaged or Defective Quarantine</option>
                    <option value="Customer Return">Customer Return Restock</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
                  >
                    Confirm Stock Update
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
