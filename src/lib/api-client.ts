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

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.idToken || response.accessToken;
  } catch {
    const response = await msalInstance.acquireTokenPopup(loginRequest);
    return response.idToken || response.accessToken;
  }
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
