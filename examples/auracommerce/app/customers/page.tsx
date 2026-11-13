"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Crown,
  ChevronRight,
  ExternalLink,
  Edit2,
  X,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Customer } from "@/lib/mock-data";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, orders } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    country: "United States",
    tier: "New" as Customer["tier"],
    status: "Active" as Customer["status"],
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  });

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "All" || cust.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const tierColors = {
    VIP: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    Platinum: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    Gold: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    New: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    addCustomer({
      ...formData,
      lastOrderDate: new Date().toISOString().split("T")[0],
    });

    setIsAddOpen(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      city: "",
      country: "United States",
      tier: "New",
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    });
  };

  // Find orders for selected customer
  const customerOrders = selectedCustomer
    ? orders.filter(
        (o) =>
          o.customerEmail.toLowerCase() === selectedCustomer.email.toLowerCase() ||
          o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Customer Directory
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {customers.length} Profiles
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View high-value patrons, lifetime expenditure statistics, purchasing frequency, and customer segments.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
          {["All", "VIP", "Platinum", "Gold", "New"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                selectedTier === tier
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Tier Segment</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={cust.avatar}
                        alt={cust.name}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-amber-600 transition-colors">
                          {cust.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{cust.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        tierColors[cust.tier]
                      }`}
                    >
                      {cust.tier === "VIP" && <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      {cust.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{cust.phone}</td>
                  <td className="py-3 px-4 text-foreground">
                    {cust.city}, {cust.country}
                  </td>
                  <td className="py-3 px-4 font-semibold text-foreground">{cust.ordersCount} orders</td>
                  <td className="py-3 px-4 font-bold text-foreground">
                    {formatCurrency(cust.totalSpent)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{cust.lastOrderDate}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(cust);
                      }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-semibold text-xs"
                    >
                      <span>Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">No customers match search</p>
            <p className="text-xs mt-1">Try searching another customer name or tier.</p>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-base font-bold text-foreground">Customer Profile</h2>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Card Header */}
              <div className="flex items-center gap-4 py-5 border-b border-border">
                <img
                  src={selectedCustomer.avatar}
                  alt={selectedCustomer.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-border shadow-sm"
                />
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {selectedCustomer.name}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tierColors[selectedCustomer.tier]
                      }`}
                    >
                      {selectedCustomer.tier} Member
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {selectedCustomer.email}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {selectedCustomer.city}, {selectedCustomer.country}
                  </p>
                </div>
              </div>

              {/* LTV & Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-b border-border">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[11px] text-muted-foreground">Lifetime Expenditure</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[11px] text-muted-foreground">Order Volume</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {selectedCustomer.ordersCount} Completed
                  </p>
                </div>
              </div>

              {/* Recent Orders by Customer */}
              <div className="py-4 flex-1">
                <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-3">
                  Purchase History ({customerOrders.length})
                </h4>

                <div className="space-y-2.5">
                  {customerOrders.map((ord) => (
                    <div key={ord.id} className="p-3 rounded-lg border border-border bg-muted/30 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-foreground">{ord.id}</span>
                        <span className="font-bold text-foreground">{formatCurrency(ord.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatDate(ord.date)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{ord.status}</span>
                      </div>
                    </div>
                  ))}

                  {customerOrders.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No recent linked orders found in the current cache.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 text-card-foreground"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold">Add Customer Record</h2>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sebastian V. Cross"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. sebastian@luxury.co"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. San Francisco"
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Tier Level</label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    >
                      <option value="New">New</option>
                      <option value="Gold">Gold</option>
                      <option value="Platinum">Platinum</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
                  >
                    Save Customer
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
