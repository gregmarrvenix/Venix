import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venix Time Tracker",
  description: "Time tracking for Venix contractors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import AppShell from "@/components/layout/AppShell";
