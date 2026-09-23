import { useAuthStore } from '../store/authStore';
import { useStaffAuthStore } from '../store/staffAuthStore';
import { useSuperAuthStore } from '../store/superAuthStore';
import { parseOrgUserId } from './orgRoutes';
import type { AuthUser } from './auth';

const AREA_KEY = 'visithub-auth-area';

export type AuthArea = 'org_admin' | 'staff' | 'super';
export type OrgAuthSlot = 'org_admin' | 'staff';

export function isSuperAdminArea(pathname: string = window.location.pathname) {
  return pathname === '/superadmin' || pathname.startsWith('/superadmin/');
}

export function isSuperAdminLoginPath(pathname: string = window.location.pathname) {
  return pathname === '/superadmin/login';
}

export function setAuthArea(area: AuthArea) {
  try {
    sessionStorage.setItem(AREA_KEY, area);
  } catch {
    /* ignore */
  }
}

export function getAuthArea(): AuthArea {
  try {
    const v = sessionStorage.getItem(AREA_KEY);
    if (v === 'super' || v === 'staff' || v === 'org_admin') return v;
    // legacy value from before admin/staff split
    if (v === 'org') return 'org_admin';
  } catch {
    /* ignore */
  }
  return 'org_admin';
}

/** Prefer URL area; for shared routes like /profile use last active tab area */
export function resolveAuthArea(pathname: string = window.location.pathname): AuthArea {
  if (isSuperAdminArea(pathname)) return 'super';
  if (pathname === '/profile') return getAuthArea();
  if (pathname === '/login' || pathname === '/create-account') return getAuthArea();
  return resolveOrgSlot(pathname);
}

/**
 * Pick admin vs staff store for this tab:
 * 1) URL /admin/:userId matches a stored user id
 * 2) this tab's sessionStorage area
 * 3) whichever org session exists
 */
export function resolveOrgSlot(pathname: string = window.location.pathname): OrgAuthSlot {
  const uid = parseOrgUserId(pathname);
  const admin = useAuthStore.getState();
  const staff = useStaffAuthStore.getState();

  if (uid) {
    if (admin.user?.id === uid && admin.token) return 'org_admin';
    if (staff.user?.id === uid && staff.token) return 'staff';
  }

  try {
    const hint = sessionStorage.getItem(AREA_KEY);
    if (hint === 'staff' && staff.token) return 'staff';
    if (hint === 'org_admin' && admin.token) return 'org_admin';
    if (hint === 'org' && admin.token) return 'org_admin';
  } catch {
    /* ignore */
  }

  if (admin.token && admin.user) return 'org_admin';
  if (staff.token && staff.user) return 'staff';
  return 'org_admin';
}

export function getOrgSlotState(slot: OrgAuthSlot): {
  token: string | null;
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setSession: (token: string, user: AuthUser) => void;
} {
  if (slot === 'staff') {
    const s = useStaffAuthStore.getState();
    return {
      token: s.token,
      user: s.user,
      setUser: s.setUser,
      clearSession: s.clearSession,
      setSession: s.setSession,
    };
  }
  const s = useAuthStore.getState();
  return {
    token: s.token,
    user: s.user,
    setUser: s.setUser,
    clearSession: s.clearSession,
    setSession: s.setSession,
  };
}

export function setOrgSessionForUser(token: string, user: AuthUser) {
  if (user.role === 'staff') {
    useStaffAuthStore.getState().setSession(token, user);
    setAuthArea('staff');
    return;
  }
  useAuthStore.getState().setSession(token, user);
  setAuthArea('org_admin');
}

export function getTokenForPath(pathname: string = window.location.pathname): string | null {
  const area = resolveAuthArea(pathname);
  if (area === 'super') return useSuperAuthStore.getState().token;
  if (area === 'staff') return useStaffAuthStore.getState().token;
  return useAuthStore.getState().token;
}

export function clearSessionForPath(pathname: string = window.location.pathname) {
  const area = resolveAuthArea(pathname);
  if (area === 'super') useSuperAuthStore.getState().clearSession();
  else if (area === 'staff') useStaffAuthStore.getState().clearSession();
  else useAuthStore.getState().clearSession();
}

export function getActiveOrgUser(pathname: string = window.location.pathname): AuthUser | null {
  return getOrgSlotState(resolveOrgSlot(pathname)).user;
}
