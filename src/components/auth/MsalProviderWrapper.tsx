"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/lib/msal-config";
import { setMsalInstance } from "@/lib/api-client";

const msalApp = new PublicClientApplication(msalConfig);

// Store ID token from redirect login — acquireTokenSilent may return empty idToken
let redirectIdToken: string | null = null;

export function consumeRedirectIdToken(): string | null {
  const t = redirectIdToken;
  redirectIdToken = null;
  return t;
}

export default function MsalProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    msalApp
      .initialize()
      .then(() => msalApp.handleRedirectPromise())
      .then((result) => {
        if (result?.idToken) {
          redirectIdToken = result.idToken;
        }
        setMsalInstance(msalApp);
        setReady(true);
      })
      .catch((err) => {
        console.error("MSAL init error:", err);
        setReady(true);
      });
  }, []);

  if (!ready) return null;

  return <MsalProvider instance={msalApp}>{children}</MsalProvider>;
}
