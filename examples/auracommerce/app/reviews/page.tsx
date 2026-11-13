"use client";

import React, { useState } from "react";
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Flag,
  Trash2,
  Reply,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Review } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ReviewsPage() {
  const { reviews, updateReviewStatus, deleteReview, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedRating, setSelectedRating] = useState<number | "All">("All");

  // Reply Modal
  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  const filteredReviews = reviews.filter((rev) => {
    const matchesSearch =
      rev.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || rev.status === selectedStatus;
    const matchesRating = selectedRating === "All" || rev.rating === selectedRating;
    return matchesSearch && matchesStatus && matchesRating;
  });

  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !replyReview) return;

    addToast({
      title: "Store Reply Published",
      description: `Official response dispatched to ${replyReview.customerName}.`,
      type: "success",
    });

    // Mark as published
    updateReviewStatus(replyReview.id, "Published");
    setReplyReview(null);
    setReplyText("");
  };

  const statusBadge = (status: Review["status"]) => {
    switch (status) {
      case "Published":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Pending":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Flagged":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Reviews & Customer Sentiments
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
              {reviews.length} Feedbacks
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit product testimonials, moderate automated spam flags, and publish official merchant replies.
          </p>
        </div>
      </div>

      {/* Ratings Aggregate Banner */}
      <div className="p-5 rounded-xl bg-card border border-border shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0">
          <div className="text-center">
            <span className="text-4xl font-extrabold text-foreground">{avgRating}</span>
            <div className="flex items-center justify-center gap-1 text-amber-500 my-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 stroke-amber-500" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Based on {reviews.length} reviews</p>
          </div>

          <div className="flex-1 space-y-1 text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars as keyof typeof ratingCounts];
              const pct = Math.round((count / (reviews.length || 1)) * 100);
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="w-8 text-[11px] text-muted-foreground font-medium">{stars} ★</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-[10px] text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="space-y-3 text-xs md:col-span-2 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Verified Buyer Ratio:</span>
            <span className="font-semibold text-foreground">
              {Math.round((reviews.filter((r) => r.verified).length / reviews.length) * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Automated Moderation Accuracy:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">99.4%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Merchant Response Turnaround:</span>
            <span className="font-semibold text-foreground">&lt; 2.5 hours</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviews by reviewer or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border focus:bg-background focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
            {["All", "Published", "Pending", "Flagged"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  selectedStatus === st
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value === "All" ? "All" : Number(e.target.value))}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border focus:outline-none cursor-pointer"
          >
            <option value="All">All Star Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars Only</option>
            <option value="1">1 Star Only</option>
          </select>
        </div>
      </div>

      {/* Reviews Stream */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => (
          <motion.div
            key={rev.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={rev.customerAvatar}
                  alt={rev.customerName}
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{rev.customerName}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? "fill-amber-500 stroke-amber-500"
                              : "text-muted-foreground/30 stroke-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span>•</span>
                    <span>{formatDate(rev.date)}</span>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-foreground">{rev.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{rev.comment}</p>
              </div>

              {/* Linked Product preview */}
              <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <img
                  src={rev.productImage}
                  alt={rev.productName}
                  className="w-6 h-6 rounded object-cover border border-border"
                />
                <span>Product:</span>
                <span className="font-semibold text-foreground">{rev.productName}</span>
              </div>
            </div>

            {/* Moderation Controls */}
            <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(rev.status)}`}>
                {rev.status}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setReplyReview(rev)}
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs inline-flex items-center gap-1"
                  title="Reply to review"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reply</span>
                </button>

                {rev.status !== "Published" && (
                  <button
                    onClick={() => updateReviewStatus(rev.id, "Published")}
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    title="Approve & Publish"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}

                {rev.status !== "Flagged" && (
                  <button
                    onClick={() => updateReviewStatus(rev.id, "Flagged")}
                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                    title="Flag for review"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => deleteReview(rev.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                  title="Delete review"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
            <Star className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">No reviews matched filter</p>
            <p className="text-xs mt-1">Try resetting the status or star rating filter.</p>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 text-card-foreground"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold">Reply to Customer Review</h2>
                <button
                  onClick={() => setReplyReview(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 my-4 rounded-xl bg-muted/40 border border-border text-xs">
                <p className="font-bold text-foreground">{replyReview.customerName} on {replyReview.productName}:</p>
                <p className="italic text-muted-foreground mt-1">&quot;{replyReview.comment}&quot;</p>
              </div>

              <form onSubmit={handleSendReply} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Official Merchant Response</label>
                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Thank you for sharing your feedback with Aura Commerce..."
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setReplyReview(null)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
                  >
                    Publish Response
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
