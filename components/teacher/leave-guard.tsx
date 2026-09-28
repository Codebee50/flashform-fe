"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";

// The "unsaved changes" warning (PRD Q7). A page with unsaved work calls
// `useUnsavedChanges(true)`. Links and buttons that leave the page go through `confirmLeave`,
// which asks first. Reloading, closing the tab or typing a URL get the browser's own prompt,
// and so does Back where the browser lets a page cancel it (Navigation API).

type LeaveGuard = {
  isDirty: () => boolean;
  setDirty: (dirty: boolean) => void;
  /** Runs `leave` now, or after the teacher agrees to discard their changes. */
  confirmLeave: (leave: () => void) => void;
};

const LeaveGuardContext = createContext<LeaveGuard>({
  isDirty: () => false,
  setDirty: () => {},
  confirmLeave: (leave) => leave(),
});

const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(false);
  const [pending, setPending] = useState<{ leave: () => void } | null>(null);

  const guard = useMemo<LeaveGuard>(
    () => ({
      isDirty: () => dirty.current,
      setDirty: (value) => {
        dirty.current = value;
      },
      confirmLeave: (leave) => {
        if (dirty.current) setPending({ leave });
        else leave();
      },
    }),
    [],
  );

  const stay = () => setPending(null);

  return (
    <LeaveGuardContext.Provider value={guard}>
      {children}
      {pending && (
        <Dialog
          title="Leave without saving?"
          description="Your changes to this quiz haven't been saved. If you leave now, they're lost."
          onClose={stay}
        >
          <DialogActions>
            <Button variant="secondary" onClick={stay} autoFocus>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dirty.current = false;
                setPending(null);
                pending.leave();
              }}
            >
              Discard changes
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </LeaveGuardContext.Provider>
  );
}

export const useLeaveGuard = () => useContext(LeaveGuardContext);

/** `onNavigate` for a `<Link>`: stops the navigation and asks first while there are changes. */
export function useGuardedNavigate() {
  const { isDirty, confirmLeave } = useLeaveGuard();
  const router = useRouter();
  return useCallback(
    (href: string) => (event: { preventDefault: () => void }) => {
      if (!isDirty()) return;
      event.preventDefault();
      confirmLeave(() => router.push(href));
    },
    [isDirty, confirmLeave, router],
  );
}

/** Just the parts of the Navigation API used here; TypeScript's DOM types don't have it yet. */
type NavigationLike = {
  addEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
  removeEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
};
type NavigateEventLike = {
  navigationType: string;
  cancelable: boolean;
  preventDefault: () => void;
};

/** Marks the page as having unsaved work while `dirty` is true. */
export function useUnsavedChanges(dirty: boolean) {
  const { setDirty } = useLeaveGuard();

  useEffect(() => {
    setDirty(dirty);
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only prompt when returnValue is set.
      event.returnValue = "";
    };
    // Back/Forward inside the app is a same-document traversal: no beforeunload.
    const onNavigate = (event: NavigateEventLike) => {
      if (event.navigationType !== "traverse" || !event.cancelable) return;
      if (!window.confirm(LEAVE_MESSAGE)) event.preventDefault();
    };
    const navigation = (window as { navigation?: NavigationLike }).navigation;

    window.addEventListener("beforeunload", onBeforeUnload);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      setDirty(false);
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigation?.removeEventListener("navigate", onNavigate);
    };
  }, [dirty, setDirty]);
}
