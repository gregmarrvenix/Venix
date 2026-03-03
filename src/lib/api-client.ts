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
    return response.idToken;
  } catch {
    const response = await msalInstance.acquireTokenPopup(loginRequest);
    return response.idToken;
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
