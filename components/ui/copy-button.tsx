"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

type Status = "idle" | "copied" | "failed";

const RESET_MS = 2000;

/** Copies `value` to the clipboard and confirms in place. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const id = window.setTimeout(() => setStatus("idle"), RESET_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const Icon = status === "copied" ? Check : Copy;

  return (
    <Button variant="secondary" onClick={() => void copy()} className={className}>
      <Icon
        className={`size-4 ${status === "copied" ? "text-success" : ""}`}
        strokeWidth={1.75}
        aria-hidden
      />
      <span aria-live="polite">
        {status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy" : label}
      </span>
    </Button>
  );
}
