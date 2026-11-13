"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Download,
  Calendar,
  CreditCard,
  MapPin,
  X,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Order } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function OrdersPage() {
  const { orders, updateOrderStatus, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    Delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Shipped: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Processing: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Pending: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    Cancelled: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  const handleStatusChange = (orderId: string, newStatus: Order["status"]) => {
    updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        status: newStatus,
      });
    }
  };

  const exportOrders = () => {
    addToast({
      title: "Orders Exported",
      description: "orders_manifest_2026.csv generated successfully.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Orders Fulfillment
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {orders.length} Records
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time transactions, process logistics fulfillment, and manage customer shipments.
          </p>
        </div>

        <button
          onClick={exportOrders}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Orders</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
          {["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => {
            const count = status === "All" ? orders.length : orders.filter((o) => o.status === status).length;
            const active = selectedStatus === status;

            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 text-xs rounded-md transition-all font-medium flex items-center gap-1.5 ${
                  active
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{status}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4 font-semibold">Total</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-foreground">{order.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={order.customerAvatar}
                        alt={order.customerName}
                        className="w-7 h-7 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-amber-600 transition-colors">
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{order.customerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDate(order.date)}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {order.items.reduce((acc, i) => acc + i.quantity, 0)} items
                  </td>
                  <td className="py-3 px-4 font-bold text-foreground">{formatCurrency(order.total)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">No orders found</p>
            <p className="text-xs mt-1">No transactions match the selected filters.</p>
          </div>
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-xl h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      Order {selectedOrder.id}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          statusColors[selectedOrder.status]
                        }`}
                      >
                        {selectedOrder.status}
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedOrder.date)}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Quick Action */}
              <div className="my-5 p-3.5 rounded-xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-foreground">Update Fulfillment State:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["Processing", "Shipped", "Delivered", "Cancelled"] as Order["status"][]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        selectedOrder.status === st
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-card border border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer and Shipping Section */}
              <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-border">
                <div>
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
                    Customer Info
                  </h4>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedOrder.customerAvatar}
                      alt={selectedOrder.customerName}
                      className="w-8 h-8 rounded-full object-cover border border-border"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{selectedOrder.customerName}</p>
                      <p className="text-muted-foreground text-[11px]">{selectedOrder.customerEmail}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
                    Shipping Address
                  </h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {selectedOrder.shippingAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="py-4 border-b border-border space-y-3">
                <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Order Items ({selectedOrder.items.length})
                </h4>
                <div className="space-y-2.5">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-muted-foreground text-[11px]">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="py-4 border-b border-border text-xs space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated Tax</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping Cost</span>
                  <span>{selectedOrder.shipping === 0 ? "Complimentary" : formatCurrency(selectedOrder.shipping)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Promotional Discount</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                  <span>Total Amount</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="pt-4 flex-1">
                <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-3">
                  Logistics Tracking Timeline
                </h4>
                <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border text-xs">
                  {selectedOrder.timeline.map((step, idx) => (
                    <div key={idx} className="relative">
                      <span
                        className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-card ${
                          step.completed ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      <p className={`font-semibold ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                      <span className="text-[10px] text-muted-foreground/70 block mt-0.5">{step.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
