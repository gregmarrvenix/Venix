"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface ToastActions {
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastActions | null>(null);

export function useToast(): ToastActions {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (type === "success") toast.success(message);
      else if (type === "error") toast.error(message);
      else toast.info(message);
    },
    []
  );

  const success = useCallback((message: string) => toast.success(message), []);
  const error = useCallback((message: string) => toast.error(message), []);
  const info = useCallback((message: string) => toast.info(message), []);

  const value = useMemo(
    () => ({ addToast, success, error, info }),
    [addToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="bottom-right" richColors />
    </ToastContext.Provider>
  );
}
