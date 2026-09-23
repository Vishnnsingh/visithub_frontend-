import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../lib/auth';
import { useStaffAuthStore } from './staffAuthStore';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
};

const LEGACY_ORG_KEY = 'visithub-org-auth';

/** Organisation admin session (separate from staff + super admin) */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: 'visithub-org-admin-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

/** One-time: split old shared org key into admin vs staff stores */
function migrateLegacyOrgAuth() {
  try {
    const raw = localStorage.getItem(LEGACY_ORG_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null; user?: AuthUser | null } };
    const token = parsed?.state?.token ?? null;
    const user = parsed?.state?.user ?? null;
    localStorage.removeItem(LEGACY_ORG_KEY);
    if (!token || !user) return;
    if (user.role === 'staff') {
      useStaffAuthStore.setState({ token, user });
    } else if (user.role === 'org_admin') {
      useAuthStore.setState({ token, user });
    }
  } catch {
    /* ignore */
  }
}

migrateLegacyOrgAuth();
