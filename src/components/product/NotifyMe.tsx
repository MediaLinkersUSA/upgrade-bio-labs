"use client";

import { useState } from "react";

/** Back-in-stock capture. Expands inline inside the card rather than opening a
 *  modal, so the demand signal costs the visitor one field and no context
 *  switch. Several SKUs are out of stock at any time and that demand is
 *  currently discarded entirely. */
export default function NotifyMe({
  slug,
  name,
  onDone,
}: {
  slug: string;
  name: string;
  onDone?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done")
    return (
      <p className="rounded-sm bg-capsule-wash px-3 py-2.5 text-[13.5px] text-success">
        We will email you when {name} is back.
      </p>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor={`notify-${slug}`} className="label text-muted">
        Email Me When Back
      </label>
      <div className="flex gap-1.5">
        <input
          id={`notify-${slug}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@lab.com"
          className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:border-teal focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-primary btn-teal px-4 py-2 text-[14px]"
        >
          {state === "sending" ? "..." : "Notify Me"}
        </button>
      </div>
      {state === "error" && (
        <p className="text-[13px] text-warn">That did not send. Try again.</p>
      )}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="self-start text-[13px] text-muted underline underline-offset-2"
        >
          cancel
        </button>
      )}
    </form>
  );
}
