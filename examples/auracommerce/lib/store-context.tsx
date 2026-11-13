"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Product,
  Category,
  Order,
  Customer,
  InventoryItem,
  DiscountCoupon,
  Review,
  NotificationItem,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_DISCOUNTS,
  INITIAL_REVIEWS,
  INITIAL_NOTIFICATIONS,
} from "./mock-data";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "info" | "warning" | "error";
}

interface StoreContextType {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "createdAt" | "sales" | "rating">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, "id" | "productCount" | "totalSales">) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Orders
  orders: Order[];
  updateOrderStatus: (id: string, status: Order["status"]) => void;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id" | "totalSpent" | "ordersCount" | "joinedDate">) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  // Inventory
  inventory: InventoryItem[];
  adjustStock: (id: string, newStock: number, reason: string) => void;

  // Discounts
  discounts: DiscountCoupon[];
  addDiscount: (discount: Omit<DiscountCoupon, "id" | "usageCount">) => void;
  toggleDiscountStatus: (id: string) => void;
  deleteDiscount: (id: string) => void;

  // Reviews
  reviews: Review[];
  updateReviewStatus: (id: string, status: Review["status"]) => void;
  deleteReview: (id: string) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [discounts, setDiscounts] = useState<DiscountCoupon[]>(INITIAL_DISCOUNTS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply dark mode class to documentElement
  useEffect(() => {
    const isSavedDark = localStorage.getItem("aura_theme") === "dark";
    if (isSavedDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("aura_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("aura_theme", "light");
      }
      return next;
    });
  };

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Product Actions
  const addProduct = (newProd: Omit<Product, "id" | "createdAt" | "sales" | "rating">) => {
    const product: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      sales: 0,
      rating: 5.0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setProducts((prev) => [product, ...prev]);

    // Also add to inventory automatically
    const invItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      sku: product.sku,
      productName: product.name,
      category: product.category,
      image: product.image,
      stock: product.stock,
      minThreshold: 10,
      location: "Main Distribution Center",
      unitCost: product.cost,
      status: product.stock === 0 ? "Out of Stock" : product.stock < 10 ? "Low Stock" : "In Stock",
      lastRestocked: new Date().toISOString().split("T")[0],
    };
    setInventory((prev) => [invItem, ...prev]);

    addToast({
      title: "Product Created",
      description: `"${product.name}" has been published to catalog.`,
      type: "success",
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          return updated;
        }
        return p;
      })
    );
    addToast({
      title: "Product Updated",
      description: "Changes have been successfully saved.",
      type: "success",
    });
  };

  const deleteProduct = (id: string) => {
    const item = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast({
      title: "Product Removed",
      description: item ? `"${item.name}" was deleted.` : "Product removed from catalog.",
      type: "info",
    });
  };

  // Category Actions
  const addCategory = (cat: Omit<Category, "id" | "productCount" | "totalSales">) => {
    const newCategory: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
      productCount: 0,
      totalSales: 0,
    };
    setCategories((prev) => [...prev, newCategory]);
    addToast({
      title: "Category Created",
      description: `Category "${newCategory.name}" is now live.`,
      type: "success",
    });
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    addToast({
      title: "Category Saved",
      description: "Category configuration updated.",
      type: "success",
    });
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    addToast({
      title: "Category Deleted",
      type: "info",
    });
  };

  // Order Actions
  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const updatedTimeline = [...o.timeline];
          if (status === "Shipped") {
            const shipStep = updatedTimeline.find((t) => t.title.toLowerCase().includes("ship"));
            if (shipStep) shipStep.completed = true;
          } else if (status === "Delivered") {
            updatedTimeline.forEach((t) => (t.completed = true));
          }
          return { ...o, status, timeline: updatedTimeline };
        }
        return o;
      })
    );
    addToast({
      title: "Order Status Updated",
      description: `Order ${id} is now ${status}.`,
      type: "success",
    });
  };

  // Customer Actions
  const addCustomer = (cust: Omit<Customer, "id" | "totalSpent" | "ordersCount" | "joinedDate">) => {
    const newCustomer: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      totalSpent: 0,
      ordersCount: 0,
      joinedDate: new Date().toISOString().split("T")[0],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    addToast({
      title: "Customer Added",
      description: `${newCustomer.name} added to customer directory.`,
      type: "success",
    });
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    addToast({
      title: "Customer Updated",
      type: "success",
    });
  };

  // Inventory Actions
  const adjustStock = (id: string, newStock: number, reason: string) => {
    setInventory((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const status: InventoryItem["status"] =
            newStock === 0 ? "Out of Stock" : newStock <= inv.minThreshold ? "Low Stock" : "In Stock";
          return {
            ...inv,
            stock: newStock,
            status,
            lastRestocked: new Date().toISOString().split("T")[0],
          };
        }
        return inv;
      })
    );
    // Sync with products list
    setProducts((prev) =>
      prev.map((p) => {
        const matching = inventory.find((i) => i.id === id);
        if (matching && p.sku === matching.sku) {
          return {
            ...p,
            stock: newStock,
            status: newStock === 0 ? "Out of Stock" : newStock <= 10 ? "Low Stock" : "In Stock",
          };
        }
        return p;
      })
    );
    addToast({
      title: "Inventory Stock Adjusted",
      description: `Stock level updated (${reason}).`,
      type: "info",
    });
  };

  // Discount Actions
  const addDiscount = (disc: Omit<DiscountCoupon, "id" | "usageCount">) => {
    const newCoupon: DiscountCoupon = {
      ...disc,
      id: `disc-${Date.now()}`,
      usageCount: 0,
    };
    setDiscounts((prev) => [newCoupon, ...prev]);
    addToast({
      title: "Coupon Activated",
      description: `Promo code "${newCoupon.code}" created.`,
      type: "success",
    });
  };

  const toggleDiscountStatus = (id: string) => {
    setDiscounts((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextStatus = d.status === "Active" ? "Expired" : "Active";
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
    addToast({
      title: "Promotion Status Toggled",
      type: "info",
    });
  };

  const deleteDiscount = (id: string) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    addToast({
      title: "Discount Removed",
      type: "info",
    });
  };

  // Review Actions
  const updateReviewStatus = (id: string, status: Review["status"]) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    addToast({
      title: "Review Moderated",
      description: `Review status changed to ${status}.`,
      type: "success",
    });
  };

  const deleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    addToast({
      title: "Review Deleted",
      type: "info",
    });
  };

  // Notification Actions
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast({
      title: "All Notifications Read",
      type: "info",
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <StoreContext.Provider
      value={{
        isDark,
        toggleTheme,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        orders,
        updateOrderStatus,
        customers,
        addCustomer,
        updateCustomer,
        inventory,
        adjustStock,
        discounts,
        addDiscount,
        toggleDiscountStatus,
        deleteDiscount,
        reviews,
        updateReviewStatus,
        deleteReview,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
