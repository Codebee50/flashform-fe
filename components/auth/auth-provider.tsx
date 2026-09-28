"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ApiError, SESSION_ENDED } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import {
  clearTokens,
  getRefreshToken,
  hasTokens,
  setTokens,
  subscribeTokens,
} from "@/lib/auth-tokens";
import type { User } from "@/lib/types";

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  /** `logged_out`: the teacher pressed Log out, as opposed to having no session. */
  | { status: "unauthenticated"; user: null; reason: "no_session" | "logged_out" }
  /** Tokens are stored but /auth/me couldn't be reached (offline, server down). */
  | { status: "error"; user: null };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  reload: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Result of /auth/me for the stored session; null until it's known. */
type Me = { user: User } | { error: true } | null;

export function AuthProvider({ children }: { children: ReactNode }) {
  // null during the server render and hydration, where localStorage can't be read.
  const hasSession = useSyncExternalStore(subscribeTokens, hasTokens, () => null);
  const [me, setMe] = useState<Me>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Forget the user once the tokens are gone (logout, failed refresh, another tab).
  useEffect(
    () =>
      subscribeTokens(() => {
        if (!hasTokens()) setMe(null);
      }),
    [],
  );

  // Load /auth/me on startup, and whenever a session appears without a known user.
  useEffect(() => {
    if (!hasSession || me) return;
    let cancelled = false;
    // A failed refresh here just means "logged out" (the tokens get cleared); the teacher
    // guard decides where to go, so no redirect from here.
    authApi.me({ redirectOnSessionEnd: false }).then(
      (user) => {
        if (!cancelled) setMe({ user });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === SESSION_ENDED) return;
        setMe({ error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hasSession, me, attempt]);

  const login = useCallback(async (email: string, password: string) => {
    const { access, refresh, user } = await authApi.login({ email, password });
    setMe({ user });
    setLoggedOut(false);
    setTokens({ access, refresh });
    return user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    // Logout is idempotent server-side; clear local tokens whatever the result.
    if (refresh) await authApi.logout(refresh).catch(() => undefined);
    setLoggedOut(true);
    clearTokens();
  }, []);

  const reload = useCallback(() => {
    setMe(null);
    setAttempt((n) => n + 1);
  }, []);

  const state: AuthState = useMemo(() => {
    if (hasSession === null) return { status: "loading", user: null };
    if (!hasSession) {
      return {
        status: "unauthenticated",
        user: null,
        reason: loggedOut ? "logged_out" : "no_session",
      };
    }
    if (me && "user" in me) return { status: "authenticated", user: me.user };
    if (me) return { status: "error", user: null };
    return { status: "loading", user: null };
  }, [hasSession, me, loggedOut]);

  const value = useMemo(
    () => ({ ...state, login, logout, reload }),
    [state, login, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** Where to go after logging in: `?next=` if it's a teacher page, else the dashboard. */
export function safeNextPath(next: string | null): string {
  return next && /^\/teacher(\/|\?|$)/.test(next) ? next : "/teacher";
}
