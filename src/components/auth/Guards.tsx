import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { homePath, USER_ROLES, type AuthRole } from '../../lib/auth';
import { staffCanOpenPath } from '../../lib/dashboardAccess';
import { api } from '../../lib/api';
import { orgPageKeyFromPathname, orgPath, orgPlanPath } from '../../lib/orgRoutes';
import { useAuthStore } from '../../store/authStore';
import { useStaffAuthStore } from '../../store/staffAuthStore';
import { useSuperAuthStore } from '../../store/superAuthStore';
import { Landing } from '../../pages/Landing';
import {
  getOrgSlotState,
  resolveOrgSlot,
  setAuthArea,
  type OrgAuthSlot,
} from '../../lib/session';

function useStoreHydrated(store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());
  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);
  return hydrated;
}

function useOrgStoresHydrated(): boolean {
  const admin = useStoreHydrated(useAuthStore);
  const staff = useStoreHydrated(useStaffAuthStore);
  return admin && staff;
}

export function isSuperAdminPath(pathname: string) {
  return pathname === '/superadmin' || pathname.startsWith('/superadmin/');
}

export function isSuperAdminLoginPath(pathname: string) {
  return pathname === '/superadmin/login';
}

/**
 * Org login — only redirect if THIS tab already chose an org slot
 * (so another tab can still open /login for the other role).
 */
export function GuestOnly() {
  const hydrated = useOrgStoresHydrated();
  const adminUser = useAuthStore((state) => state.user);
  const staffUser = useStaffAuthStore((state) => state.user);

  if (!hydrated) return null;

  let area: string | null = null;
  try {
    area = sessionStorage.getItem('visithub-auth-area');
  } catch {
    area = null;
  }

  if (area === 'staff' && staffUser) {
    return <Navigate to={homePath(staffUser)} replace />;
  }
  if ((area === 'org_admin' || area === 'org') && adminUser) {
    return <Navigate to={homePath(adminUser)} replace />;
  }

  return <Outlet />;
}

/** Super admin login (/superadmin/login) — uses super session only */
export function SuperGuestOnly() {
  const hydrated = useStoreHydrated(useSuperAuthStore);
  const user = useSuperAuthStore((state) => state.user);

  if (!hydrated) return null;
  if (user?.role === USER_ROLES.SUPER_ADMIN) {
    return <Navigate to="/superadmin" replace />;
  }
  return <Outlet />;
}

function useActiveOrgSession(pathname: string) {
  const slot = resolveOrgSlot(pathname);
  const adminToken = useAuthStore((s) => s.token);
  const adminUser = useAuthStore((s) => s.user);
  const staffToken = useStaffAuthStore((s) => s.token);
  const staffUser = useStaffAuthStore((s) => s.user);

  if (slot === 'staff') {
    return { slot, token: staffToken, user: staffUser } as const;
  }
  return { slot, token: adminToken, user: adminUser } as const;
}

export function RequireAuth({ roles }: { roles?: AuthRole[] }) {
  const hydrated = useOrgStoresHydrated();
  const location = useLocation();
  const { slot, token, user } = useActiveOrgSession(location.pathname);

  useEffect(() => {
    setAuthArea(slot);
  }, [slot]);

  if (!hydrated) return null;
  if (!token || !user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath(user)} replace />;
  }
  if (user.role === USER_ROLES.STAFF && roles?.includes(USER_ROLES.STAFF)) {
    const pageKey = orgPageKeyFromPathname(location.pathname);
    if (pageKey !== '/plan' && !staffCanOpenPath(user.allowedPages, location.pathname)) {
      return <Navigate to={homePath(user)} replace />;
    }
  }
  return <Outlet />;
}

/** Ensures /admin/:userId matches the logged-in profile UUID for this tab's slot */
export function RequireOwnOrgUserId() {
  const { userId } = useParams();
  const location = useLocation();
  const { user } = useActiveOrgSession(location.pathname);

  if (!user) return <Navigate to="/login" replace />;
  if (!userId || userId !== user.id) {
    const key = orgPageKeyFromPathname(location.pathname);
    return <Navigate to={orgPath(user.id, key)} replace />;
  }
  return <Outlet />;
}

export function RequireSuperAdmin() {
  const hydrated = useStoreHydrated(useSuperAuthStore);
  const location = useLocation();
  const token = useSuperAuthStore((state) => state.token);
  const user = useSuperAuthStore((state) => state.user);

  useEffect(() => {
    setAuthArea('super');
  }, []);

  if (!hydrated) return null;

  if (!token || !user || user.role !== USER_ROLES.SUPER_ADMIN) {
    const next = encodeURIComponent(location.pathname || '/superadmin');
    return <Navigate to={`/superadmin/login?next=${next}`} replace />;
  }

  return <Outlet />;
}

/** Profile works for whichever session opened it (admin / staff / super tab) */
export function RequireProfileAuth() {
  const hydrated = useOrgStoresHydrated();
  const superHydrated = useStoreHydrated(useSuperAuthStore);
  const adminUser = useAuthStore((s) => s.user);
  const adminToken = useAuthStore((s) => s.token);
  const staffUser = useStaffAuthStore((s) => s.user);
  const staffToken = useStaffAuthStore((s) => s.token);
  const superUser = useSuperAuthStore((s) => s.user);
  const superToken = useSuperAuthStore((s) => s.token);

  let area: string | null = null;
  try {
    area = sessionStorage.getItem('visithub-auth-area');
  } catch {
    area = null;
  }

  if (!hydrated || !superHydrated) return null;

  if (area === 'super' && superToken && superUser) return <Outlet />;
  if (area === 'staff' && staffToken && staffUser) return <Outlet />;
  if ((area === 'org_admin' || area === 'org') && adminToken && adminUser) return <Outlet />;
  if (adminToken && adminUser) return <Outlet />;
  if (staffToken && staffUser) return <Outlet />;
  if (superToken && superUser) return <Outlet />;

  return <Navigate to="/login" replace />;
}

export function RequireActivePlan() {
  const hydrated = useOrgStoresHydrated();
  const location = useLocation();
  const { user } = useActiveOrgSession(location.pathname);

  const statusQuery = useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async () => {
      const response = await api.get('/subscription/status');
      return response.data.data as { hasActivePlan: boolean };
    },
    enabled: Boolean(
      hydrated &&
        user &&
        (user.role === USER_ROLES.ORG_ADMIN || user.role === USER_ROLES.STAFF)
    ),
    staleTime: 15_000,
    retry: false,
  });

  if (!hydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== USER_ROLES.ORG_ADMIN && user.role !== USER_ROLES.STAFF) {
    return <Navigate to={homePath(user)} replace />;
  }

  if (statusQuery.isLoading) return null;
  if (statusQuery.isError || !statusQuery.data?.hasActivePlan) {
    return <Navigate to={orgPlanPath(user.id)} replace />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  return <Landing />;
}

/** @deprecated keep export for any external use */
export type { OrgAuthSlot };
export { getOrgSlotState };
