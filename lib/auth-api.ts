// Teacher auth endpoints (docs/api/auth.md). Only /auth/me uses the access token; the
// others are public and must never trigger the refresh-and-retry logic.
import { api } from "./api";
import type {
  AuthResponse,
  Detail,
  LoginRequest,
  PasswordResetConfirmRequest,
  RegisterRequest,
  RegisterResponse,
  User,
} from "./types";

const PUBLIC = { auth: false } as const;

export const authApi = {
  register: (body: RegisterRequest) => api.post<RegisterResponse>("/auth/register", body, PUBLIC),
  login: (body: LoginRequest) => api.post<AuthResponse>("/auth/login", body, PUBLIC),
  verifyEmail: (token: string) => api.post<Detail>("/auth/verify-email", { token }, PUBLIC),
  resendVerification: (email: string) =>
    api.post<Detail>("/auth/resend-verification", { email }, PUBLIC),
  requestPasswordReset: (email: string) =>
    api.post<Detail>("/auth/password-reset", { email }, PUBLIC),
  confirmPasswordReset: (body: PasswordResetConfirmRequest) =>
    api.post<Detail>("/auth/password-reset/confirm", body, PUBLIC),
  logout: (refresh: string) => api.post<void>("/auth/logout", { refresh }, PUBLIC),
  me: (options?: { redirectOnSessionEnd?: boolean; signal?: AbortSignal }) =>
    api.get<User>("/auth/me", options),
};
