"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import {
  InteractionStatus,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { loginRequest } from "@/lib/msal-config";
import type { AuthUser } from "@/lib/types";
import { consumeRedirectIdToken } from "./MsalProviderWrapper";
import LoginScreen from "./LoginScreen";

interface AuthContextValue {
  contractorId: string;
  displayName: string;
}

const AUTH_CACHE_KEY = "venix-auth-user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthGuard");
  return ctx;
}

function getCachedAuth(): AuthContextValue | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }
  return null;
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();

  const [authUser, setAuthUser] = useState<AuthContextValue | null>(
    getCachedAuth
  );
  const [denied, setDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(!getCachedAuth());
  const validating = useRef(false);

  // Clear cache when user logs out
  useEffect(() => {
    if (!isAuthenticated && inProgress === InteractionStatus.None) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      setAuthUser(null);
    }
  }, [isAuthenticated, inProgress]);

  useEffect(() => {
    // Wait until MSAL is done with any in-progress interactions
    if (inProgress !== InteractionStatus.None) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Already validated (from cache or previous run)
    if (authUser) {
      setLoading(false);
      return;
    }

    // Prevent concurrent validations
    if (validating.current) return;
    validating.current = true;

    let cancelled = false;

    async function validate() {
      try {
        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        // 1. Try token captured from login redirect
        let token = consumeRedirectIdToken();

        // 2. Fall back to acquireTokenSilent
        if (!token) {
          const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          });
          token = tokenResponse.idToken || tokenResponse.accessToken;
        }

        if (!token) {
          // Force re-login if no token available
          instance.loginRedirect(loginRequest);
          return;
        }

        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          if (!cancelled) {
            setErrorMsg(errBody.error || `HTTP ${res.status}`);
            setDenied(true);
          }
          return;
        }

        const data: AuthUser = await res.json();
        if (!cancelled) {
          const value = {
            contractorId: data.contractor_id,
            displayName: data.display_name,
          };
          setAuthUser(value);
          sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(value));
        }
      } catch (err) {
        if (cancelled) return;

        // If silent token acquisition fails, fall back to redirect
        if (err instanceof InteractionRequiredAuthError) {
          instance.acquireTokenRedirect(loginRequest);
          return;
        }

        setErrorMsg(err instanceof Error ? err.message : String(err));
        setDenied(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          validating.current = false;
        }
      }
    }

    validate();
    return () => {
      cancelled = true;
      validating.current = false;
    };
  }, [isAuthenticated, inProgress, instance, authUser]);

  if (loading || inProgress !== InteractionStatus.None) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
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
        {errorMsg && (
          <p className="mt-4 max-w-md rounded bg-slate-800 p-3 text-sm text-red-400">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authUser}>{children}</AuthContext.Provider>
  );
}

export { AuthContext };
