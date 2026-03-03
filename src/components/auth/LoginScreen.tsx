"use client";

import { useState } from "react";
import Image from "next/image";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal-config";

export default function LoginScreen() {
  const { instance } = useMsal();
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    try {
      setError(null);
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-slate-200">
      <Image
        src="/logo.webp"
        alt="Venix IT Services"
        width={170}
        height={100}
        style={{ filter: "brightness(0) saturate(100%)" }}
        priority
      />
      <p className="mt-4 text-sm text-slate-400">
        Sign in with your organization account to start tracking time.
      </p>

      <button
        onClick={handleLogin}
        className="mt-8 flex items-center gap-3 rounded-lg bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600"
      >
        <MicrosoftLogo />
        Sign in with Microsoft
      </button>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
