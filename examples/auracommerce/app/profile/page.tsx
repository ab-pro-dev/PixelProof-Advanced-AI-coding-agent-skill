"use client";

import React, { useState } from "react";
import {
  UserCircle,
  ShieldCheck,
  Key,
  Smartphone,
  Laptop,
  Clock,
  Save,
  Check,
  Mail,
  Phone,
  Camera,
  MapPin,
  Sparkles,
  Lock,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { addToast } = useStore();

  const [profileData, setProfileData] = useState({
    name: "Alex Vance",
    role: "Senior Store Administrator",
    department: "Executive Merchandising & Operations",
    email: "alex.vance@auracommerce.com",
    phone: "+1 (415) 890-4491",
    location: "San Francisco, California, USA",
    bio: "Supervising global omnichannel luxury catalog operations, supplier logistics contracts, and premium concierge experiences.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const activeSessions = [
    {
      device: "Google Chrome on Linux (Ubuntu 24.04)",
      location: "San Francisco, CA, USA",
      ip: "192.168.1.104",
      lastActive: "Current Active Session",
      current: true,
    },
    {
      device: "Safari on iPhone 16 Pro Max",
      location: "San Francisco, CA, USA",
      ip: "172.56.21.89",
      lastActive: "42 minutes ago",
      current: false,
    },
    {
      device: "Firefox Developer Edition on macOS Sonoma",
      location: "Palo Alto, CA, USA",
      ip: "24.130.82.11",
      lastActive: "Yesterday at 6:15 PM",
      current: false,
    },
  ];

  const auditLogs = [
    {
      action: "Created Product Listing",
      target: "Aero Mechanical Wireless Keyboard (TEC-KB-008)",
      timestamp: "Today at 08:30 AM",
    },
    {
      action: "Adjusted Inventory Stock",
      target: "Chronos Heritage Watch (+18 Units)",
      timestamp: "Yesterday at 04:12 PM",
    },
    {
      action: "Processed Customer Refund",
      target: "Order #ORD-9396 ($264.60 to Visa 4022)",
      timestamp: "Nov 6 at 01:00 PM",
    },
    {
      action: "Issued Holiday Campaign",
      target: "BLACKFRIDAY30 coupon activated",
      timestamp: "Nov 5 at 11:20 AM",
    },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      title: "Profile Updated",
      description: "Administrator identity and contact preferences saved.",
      type: "success",
    });
  };

  const toggle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    addToast({
      title: !twoFactorEnabled ? "2FA Protection Enabled" : "2FA Disabled",
      description: !twoFactorEnabled
        ? "Hardware security key & Authenticator app active."
        : "Warning: Two-factor verification is now deactivated.",
      type: !twoFactorEnabled ? "success" : "warning",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Administrator Profile
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              Verified Super Admin
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal identity credentials, account security, hardware authenticators, and audit history.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Personal Information Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card Header */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative group shrink-0">
              <img
                src={profileData.avatar}
                alt={profileData.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-border shadow-md"
              />
              <button
                type="button"
                onClick={() => {
                  addToast({
                    title: "Avatar Upload",
                    description: "Select an image file from your device.",
                    type: "info",
                  });
                }}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Change Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg font-bold text-foreground">{profileData.name}</h2>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                {profileData.role}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{profileData.department}</p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {profileData.location}
              </p>
            </div>
          </div>

          {/* Editable Personal Form */}
          <form onSubmit={handleSaveProfile} className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-foreground">Contact & Identity Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="font-semibold block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Assigned Department</label>
                <input
                  type="text"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Executive Summary / Bio</label>
              <textarea
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:bg-background focus:outline-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Save Profile Information
              </button>
            </div>
          </form>

          {/* Active Sessions */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-foreground">Active Authenticated Sessions</h3>
            <p className="text-muted-foreground text-xs">
              Devices currently signed into this administrator account.
            </p>

            <div className="divide-y divide-border pt-1">
              {activeSessions.map((s, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Laptop className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-2">
                        {s.device}
                        {s.current && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {s.location} • {s.ip}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{s.lastActive}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Security, 2FA & Audit Logs (1 col) */}
        <div className="space-y-6 text-xs">
          {/* Security & 2FA */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Account Security</h3>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Two-Factor Authentication</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    twoFactorEnabled
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-600"
                  }`}
                >
                  {twoFactorEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Requires FIDO2 security key or authenticator application token upon signing in.
              </p>
              <button
                type="button"
                onClick={toggle2FA}
                className="w-full mt-1 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors"
              >
                {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA Protection"}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
              <span className="font-bold text-foreground block">Master Password</span>
              <p className="text-[11px] text-muted-foreground">
                Last modified 45 days ago. Recommended rotation every 90 days.
              </p>
              <button
                type="button"
                onClick={() => {
                  addToast({
                    title: "Password Reset Link Dispatched",
                    description: "Check your email for secure rotation steps.",
                    type: "info",
                  });
                }}
                className="w-full py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Admin Audit Logs */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Recent Admin Audit Activity</h3>
            <p className="text-muted-foreground text-[11px]">
              Immutable event trail recorded for compliance.
            </p>

            <div className="space-y-3 pt-1">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1">
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="text-muted-foreground text-[11px] truncate">{log.target}</p>
                  <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
