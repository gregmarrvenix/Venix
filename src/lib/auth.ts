import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabase } from "./supabase";
import type { AuthUser } from "./types";

const JWKS_URI = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`;
const jwks = createRemoteJWKSet(new URL(JWKS_URI));

// Server-side auth cache: token hash → { user, expires }
const AUTH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const authCache = new Map<string, { user: AuthUser; expires: number }>();

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateToken(token: string): Promise<AuthUser> {
  // Check cache first
  const tokenHash = await hashToken(token);
  const cached = authCache.get(tokenHash);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  const { payload } = await jwtVerify(token, jwks, {
    audience: process.env.AZURE_CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
  });

  const email = (payload.preferred_username || payload.email || payload.upn) as string;
  const oid = (payload.oid || payload.sub) as string;

  if (!email || !oid) {
    throw new Error("Authentication failed");
  }

  // Look up contractor by email
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, email, display_name, is_active, microsoft_oid")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !contractor) {
    throw new Error("Authentication failed");
  }

  if (!contractor.is_active) {
    throw new Error("Authentication failed");
  }

  // Link microsoft_oid on first login
  if (!contractor.microsoft_oid) {
    await supabase
      .from("contractors")
      .update({ microsoft_oid: oid, updated_at: new Date().toISOString() })
      .eq("id", contractor.id);
  }

  const user: AuthUser = {
    contractor_id: contractor.id,
    email: contractor.email,
    display_name: contractor.display_name,
    microsoft_oid: oid,
  };

  // Cache the result
  authCache.set(tokenHash, { user, expires: Date.now() + AUTH_CACHE_TTL });

  // Prune expired entries periodically
  if (authCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of authCache) {
      if (val.expires <= now) authCache.delete(key);
    }
  }

  return user;
}

export async function getAuthUser(
  request: Request
): Promise<AuthUser> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization header");
  }
  const token = authHeader.slice(7);
  return validateToken(token);
}
