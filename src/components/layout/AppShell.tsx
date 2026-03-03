"use client";

import { type ReactNode } from "react";
import MsalProviderWrapper from "@/components/auth/MsalProviderWrapper";
import AuthGuard from "@/components/auth/AuthGuard";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "./ThemeProvider";
import Header from "./Header";
import MobileNav from "./MobileNav";
import Footer from "./Footer";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <MsalProviderWrapper>
      <AuthGuard>
        <ThemeProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-18 md:pb-4">
                {children}
              </main>
              <Footer />
              <MobileNav />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </AuthGuard>
    </MsalProviderWrapper>
  );
}
