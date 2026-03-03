import { PublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "./msal-config";

let msalInstance: PublicClientApplication | null = null;

export function setMsalInstance(instance: PublicClientApplication) {
  msalInstance = instance;
}

export async function getAccessToken(): Promise<string> {
  if (!msalInstance) throw new Error("MSAL not initialized");
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error("No authenticated user");

  // Try silent acquisition
  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    if (response.idToken) return response.idToken;
  } catch {
    // Silent failed, will try forced refresh below
  }

  // Force a network refresh to get a fresh idToken
  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
      forceRefresh: true,
    });
    if (response.idToken) return response.idToken;
  } catch {
    // Forced refresh failed, will try redirect below
  }

  // Last resort: interactive redirect to get a new idToken
  await msalInstance.acquireTokenRedirect({
    ...loginRequest,
    account: accounts[0],
  });

  // acquireTokenRedirect navigates away, so this line won't execute.
  // After redirect back, the AuthGuard will pick up the new token.
  throw new Error("Redirecting to login...");
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    throw new Error(`Token acquisition failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!token) {
    throw new Error("Token acquisition returned empty token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Merge any caller-provided headers
  if (options.headers) {
    const extra = options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : (options.headers as Record<string, string>);
    Object.assign(headers, extra);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
