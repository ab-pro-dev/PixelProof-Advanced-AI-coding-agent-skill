"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  X,
  AlertTriangle,
  Upload,
  ExternalLink,
  Tag,
  Star,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Product } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, categories } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "sales" | "stock">("sales");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "Luxury Timepieces",
    price: 299,
    cost: 120,
    stock: 25,
    status: "In Stock" as Product["status"],
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    description: "",
  });

  // Filter and Sort Logic
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || prod.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || prod.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "sales") return b.sales - a.sales;
    if (sortBy === "stock") return a.stock - b.stock;
    return a.name.localeCompare(b.name);
  });

  // Open Edit Modal
  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      price: prod.price,
      cost: prod.cost,
      stock: prod.stock,
      status: prod.status,
      image: prod.image,
      description: prod.description,
    });
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;

    const computedStatus: Product["status"] =
      Number(formData.stock) === 0
        ? "Out of Stock"
        : Number(formData.stock) < 10
        ? "Low Stock"
        : "In Stock";

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        status: computedStatus,
      });
      setEditingProduct(null);
    } else {
      addProduct({
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        status: computedStatus,
      });
      setIsAddOpen(false);
    }

    // Reset
    setFormData({
      name: "",
      sku: "",
      category: "Luxury Timepieces",
      price: 299,
      cost: 120,
      stock: 25,
      status: "In Stock",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      description: "",
    });
  };

  const statusBadge = (status: Product["status"]) => {
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
            Product Catalog
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {products.length} Items
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your merchandise inventory, edit product details, adjust pricing, and track velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, SKU, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border focus:outline-none cursor-pointer"
          >
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border focus:outline-none cursor-pointer"
          >
            <option value="sales">Best Selling</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="stock">Lowest Stock</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Main Product Presentation */}
      {viewMode === "table" ? (
        <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Price</th>
                  <th className="py-3 px-4 font-semibold">Stock</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Sales</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-muted/40 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[200px]">{prod.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                            {prod.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{prod.sku}</td>
                    <td className="py-3 px-4 text-foreground">{prod.category}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{formatCurrency(prod.price)}</td>
                    <td className="py-3 px-4 font-medium">{prod.stock} units</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge(prod.status)}`}>
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{prod.sales}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(prod.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedProducts.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No products match criteria</p>
              <p className="text-xs mt-1">Try relaxing filters or search terms.</p>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedProducts.map((prod) => (
            <motion.div
              key={prod.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-card border border-border shadow-xs overflow-hidden flex flex-col group hover:border-amber-500/40 transition-all"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md ${statusBadge(prod.status)}`}>
                  {prod.status}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{prod.category}</span>
                    <span className="font-mono">{prod.sku}</span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1">{prod.name}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {prod.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">{formatCurrency(prod.price)}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">Stock: {prod.stock}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(prod.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {(isAddOpen || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 text-card-foreground overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-base font-bold tracking-tight">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <button
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingProduct(null);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Master Chronograph Automatic"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">SKU</label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g. TIM-CR-009"
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Retail Price ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Cost of Goods ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Stock Units</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Product Image URL</label>
                  <input
                    type="url"
                    required
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details on materials, dimensions, and craftsmanship..."
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddOpen(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                  >
                    {editingProduct ? "Save Changes" : "Create Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-border rounded-xl p-5 text-card-foreground shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Delete Product</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete this product? This action cannot be undone and will remove it from the store catalog.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteProduct(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
