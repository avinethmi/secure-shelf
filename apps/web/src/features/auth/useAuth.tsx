import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Permission, Role } from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  totpEnabled: boolean;
  permissions: Permission[];
};

type LoginResult = { status: 'authenticated' | 'totp_required' | 'totp_enrolment_required'; user?: AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTotp: (kind: 'verify' | 'confirm', code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (...permissions: Permission[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Access tokens live 15 minutes (NFR-02). The provider silently refreshes a little before
// that so a working session never interrupts the user, and stops refreshing on logout.
const REFRESH_EVERY_MS = 13 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const stopRefresh = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
  };
  const startRefresh = useCallback(() => {
    stopRefresh();
    timer.current = window.setInterval(async () => {
      try {
        const r = await api.post<{ user: AuthUser }>('/auth/refresh');
        setUser(r.user);
      } catch {
        setUser(null);
        stopRefresh();
      }
    }, REFRESH_EVERY_MS);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(r.user);
      startRefresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Access token may simply have expired while the tab was closed: try one refresh.
        try {
          const r = await api.post<{ user: AuthUser }>('/auth/refresh');
          setUser(r.user);
          startRefresh();
          return;
        } catch {
          /* fall through */
        }
      }
      setUser(null);
    }
  }, [startRefresh]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    return stopRefresh;
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const r = await api.post<LoginResult>('/auth/login', { email, password });
        if (r.status === 'authenticated' && r.user) {
          setUser(r.user);
          startRefresh();
        }
        return r;
      },
      async completeTotp(kind, code) {
        const r = await api.post<{ user: AuthUser }>(`/auth/totp/${kind}`, { code });
        setUser(r.user);
        startRefresh();
        return r.user;
      },
      async logout() {
        stopRefresh();
        try {
          await api.post('/auth/logout');
        } finally {
          setUser(null);
        }
      },
      refreshUser,
      can: (...permissions) => !!user && permissions.some((p) => user.permissions.includes(p)),
    }),
    [user, loading, refreshUser, startRefresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
