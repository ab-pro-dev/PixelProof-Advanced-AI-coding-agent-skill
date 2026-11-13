"use client";

import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Package,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Category } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
    status: "Active" as Category["status"],
  });

  // Calculate live product count per category
  const categoriesWithLiveCount = categories.map((cat) => {
    const count = products.filter((p) => p.category === cat.name).length;
    return {
      ...cat,
      liveCount: count || cat.productCount,
    };
  });

  const filteredCategories = categoriesWithLiveCount.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProductsAcrossCategories = categoriesWithLiveCount.reduce((acc, c) => acc + c.liveCount, 0);
  const totalCategoryRevenue = categories.reduce((acc, c) => acc + c.totalSales, 0);

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      status: cat.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
      status: "Active",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-");

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        ...formData,
        slug,
      });
    } else {
      addCategory({
        ...formData,
        slug,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Categories & Collections
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {categories.length} Collections
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize catalog hierarchy, manage merchandising collections, and monitor category sales revenue.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Active Categories</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {categories.filter((c) => c.status === "Active").length} / {categories.length}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            All primary collections visible
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Catalog Depth</p>
          <p className="text-xl font-bold text-foreground mt-1">{totalProductsAcrossCategories} Products</p>
          <span className="text-[11px] text-muted-foreground">Across all structured segments</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Category Cumulative Sales</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalCategoryRevenue)}</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Top segment: Designer Apparel
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Categories Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border shadow-xs overflow-hidden flex flex-col group hover:border-amber-500/40 transition-all"
          >
            {/* Image Preview Banner */}
            <div className="relative h-40 w-full overflow-hidden bg-muted">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border ${
                    category.status === "Active"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
                  }`}
                >
                  {category.status}
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="font-bold text-base tracking-tight leading-snug">{category.name}</h3>
                <p className="text-[11px] text-white/70 font-mono">/{category.slug}</p>
              </div>
            </div>

            {/* Category Info */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {category.description}
              </p>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                    <span>{category.liveCount} Products</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Sales: {formatCurrency(category.totalSales)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(category)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(category.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
          <FolderTree className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-foreground">No categories found</p>
          <p className="text-xs mt-1">Try searching another collection term.</p>
        </div>
      )}

      {/* Create / Edit Modal */}
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
                <h2 className="text-base font-bold">
                  {editingCategory ? "Edit Category" : "Create New Category"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Fine Jewelry & Accessories"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. fine-jewelry (auto-generated if empty)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    required
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description for customer navigation..."
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
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
                    {editingCategory ? "Update Category" : "Create Category"}
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
              className="w-full max-w-sm bg-card border border-border rounded-xl p-5 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Delete Category</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete this category? Associated products will remain in your catalog but become uncategorized.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteCategory(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
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
