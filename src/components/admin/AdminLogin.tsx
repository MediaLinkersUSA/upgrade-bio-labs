"use client";

import { useState } from "react";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return window.location.reload();
    const body = await res.json().catch(() => ({}));
    setMessage(body.error ?? "Could not sign in.");
    setState("error");
  }

  return (
    <div className="container-site flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-[380px] rounded-lg border border-line-soft bg-surface p-8 shadow-card">
        <p className="label text-teal-dark">Upgrade Bio Labs</p>
        <h1 className="t-display-md mt-2">Dashboard</h1>

        {configured ? (
          <form onSubmit={submit} className="mt-6">
            <label htmlFor="pw" className="label mb-2 block text-muted">
              Password
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-line bg-surface px-4 py-3 text-[15px] focus:border-teal focus:outline-none"
            />
            <button type="submit" disabled={state === "sending"} className="btn-primary mt-4 w-full">
              {state === "sending" ? "checking..." : "sign in"}
            </button>
            {state === "error" && (
              <p className="mt-3 text-[13.5px] text-warn">{message}</p>
            )}
          </form>
        ) : (
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            Admin access is not configured on this deployment. Set an{" "}
            <code className="rounded bg-surface-2 px-1">ADMIN_PASSWORD</code>{" "}
            environment variable (8 characters or more) and redeploy.
          </p>
        )}
      </div>
    </div>
  );
}
