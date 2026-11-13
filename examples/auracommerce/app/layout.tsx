import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store-context";
import { DashboardLayout } from "@/components/dashboard-layout";

export const metadata: Metadata = {
  title: "Aura Commerce — Premium E-Commerce Admin",
  description: "Next-generation luxury e-commerce operations, analytics, and catalog management dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <StoreProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </StoreProvider>
      </body>
    </html>
  );
}
