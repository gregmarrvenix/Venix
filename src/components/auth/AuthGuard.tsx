"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal-config";
import type { AuthUser } from "@/lib/types";
import LoginScreen from "./LoginScreen";

interface AuthContextValue {
  contractorId: string;
  displayName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthGuard");
  return ctx;
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  const [authUser, setAuthUser] = useState<AuthContextValue | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || accounts.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function validate() {
      try {
        const tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });

        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenResponse.idToken}`,
          },
        });

        if (!res.ok) {
          if (!cancelled) setDenied(true);
          return;
        }

        const data: AuthUser = await res.json();
        if (!cancelled) {
          setAuthUser({
            contractorId: data.contractor_id,
            displayName: data.display_name,
          });
        }
      } catch {
        if (!cancelled) setDenied(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accounts, instance]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (denied || !authUser) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-slate-200">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-slate-400">
          Contact your administrator to get access.
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authUser}>{children}</AuthContext.Provider>
  );
}

export { AuthContext };
