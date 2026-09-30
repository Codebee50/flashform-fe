import type { ComponentProps } from "react";

type ToggleButtonProps = Omit<ComponentProps<"button">, "aria-pressed"> & { pressed: boolean };

/**
 * A button that stays pressed (`aria-pressed`), styled like a checked segment. Keep the label
 * the same in both states ("Hide names"): the pressed look says whether it's on.
 */
export function ToggleButton({ pressed, className = "", type = "button", ...props }: ToggleButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-body font-medium whitespace-nowrap " +
        "transition-[background-color,border-color,color,transform] duration-150 ease-brand motion-safe:active:scale-[0.98] " +
        "disabled:pointer-events-none disabled:opacity-50 " +
        (pressed
          ? "border-accent bg-accent-subtle text-text"
          : "border-border-strong bg-surface text-text-muted hover:border-text-subtle hover:bg-surface-2 hover:text-text") +
        ` ${className}`
      }
      {...props}
    />
  );
}
