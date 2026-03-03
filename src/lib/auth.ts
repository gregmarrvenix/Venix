import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabase } from "./supabase";
import type { AuthUser } from "./types";

const JWKS_URI = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`;
const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export async function validateToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: [
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
    ],
    audience: process.env.AZURE_CLIENT_ID,
  });

  const email = (payload.preferred_username || payload.email) as string;
  const oid = payload.oid as string;
  const name = payload.name as string;

  if (!email || !oid) {
    throw new Error("Token missing required claims");
  }

  // Look up contractor by email
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, email, display_name, is_active, microsoft_oid")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !contractor) {
    throw new Error("Access denied — not a registered contractor");
  }

  if (!contractor.is_active) {
    throw new Error("Access denied — account is inactive");
  }

  // Link microsoft_oid on first login
  if (!contractor.microsoft_oid) {
    await supabase
      .from("contractors")
      .update({ microsoft_oid: oid, updated_at: new Date().toISOString() })
      .eq("id", contractor.id);
  }

  return {
    contractor_id: contractor.id,
    email: contractor.email,
    display_name: contractor.display_name,
    microsoft_oid: oid,
  };
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
