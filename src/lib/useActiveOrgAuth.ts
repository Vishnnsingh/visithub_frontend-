import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useStaffAuthStore } from '../store/staffAuthStore';
import { resolveOrgSlot, type OrgAuthSlot } from './session';
import type { AuthUser } from './auth';

/** Current tab's org admin or staff session (URL + sessionStorage aware) */
export function useActiveOrgAuth(): {
  slot: OrgAuthSlot;
  token: string | null;
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
} {
  const { pathname } = useLocation();
  const slot = resolveOrgSlot(pathname);

  const adminToken = useAuthStore((s) => s.token);
  const adminUser = useAuthStore((s) => s.user);
  const setAdminUser = useAuthStore((s) => s.setUser);
  const clearAdmin = useAuthStore((s) => s.clearSession);

  const staffToken = useStaffAuthStore((s) => s.token);
  const staffUser = useStaffAuthStore((s) => s.user);
  const setStaffUser = useStaffAuthStore((s) => s.setUser);
  const clearStaff = useStaffAuthStore((s) => s.clearSession);

  if (slot === 'staff') {
    return {
      slot,
      token: staffToken,
      user: staffUser,
      setUser: setStaffUser,
      clearSession: clearStaff,
    };
  }

  return {
    slot,
    token: adminToken,
    user: adminUser,
    setUser: setAdminUser,
    clearSession: clearAdmin,
  };
}
