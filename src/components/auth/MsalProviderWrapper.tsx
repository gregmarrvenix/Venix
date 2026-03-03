"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/lib/msal-config";
import { setMsalInstance } from "@/lib/api-client";

const msalApp = new PublicClientApplication(msalConfig);

export default function MsalProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    msalApp.initialize().then(() => {
      setMsalInstance(msalApp);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return <MsalProvider instance={msalApp}>{children}</MsalProvider>;
}
