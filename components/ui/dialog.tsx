"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  /** While true, Esc and clicks outside don't close the dialog (e.g. a request is running). */
  busy?: boolean;
};

/**
 * A modal dialog, open for as long as it is mounted. Built on the native <dialog>, which
 * traps focus, closes on Esc and puts everything else behind it out of reach.
 */
export function Dialog({ title, description, children, onClose, busy = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      // The dialog is unmounted rather than closed, so the browser doesn't restore focus.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      // The dialog fills the screen; a click that lands on it (not the panel) is outside.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className={
        "m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 pt-16 backdrop:bg-scrim sm:pt-4 " +
        "open:flex open:items-start open:justify-center sm:open:items-center"
      }
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-text shadow-float motion-safe:animate-fade-in">
        <h2 id={titleId} className="text-h3 font-semibold text-text">
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className="mt-2 text-body text-text-muted">
            {description}
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </dialog>
  );
}

/** The row of buttons at the bottom of a dialog: secondary first, primary last. */
export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
  );
}
