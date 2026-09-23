import type { AuthUser } from './auth';

/** Logical page keys stored in staff allowedPages (unchanged). */
export type OrgPageKey =
  | '/admin'
  | '/plan'
  | '/staff'
  | '/organisation'
  | '/qr-codes'
  | '/visitor-details'
  | '/tickets'
  | '/notifications'
  | '/home-element'
  | '/active-fields';

/** `/admin/{userId}` or `/admin/{userId}/plan` etc. */
export function orgPath(userId: string, page: string = '/admin'): string {
  const id = String(userId || '').trim();
  if (!id) return '/login';
  const key = page === '/dashboard' ? '/admin' : page;
  if (!key || key === '/admin') return `/admin/${id}`;
  const suffix = key.startsWith('/') ? key : `/${key}`;
  return `/admin/${id}${suffix}`;
}

export function orgPlanPath(userId: string) {
  return orgPath(userId, '/plan');
}

/** From `/admin/:userId/...` → logical key `/admin` | `/plan` | ... */
export function orgPageKeyFromPathname(pathname: string): string {
  const m = /^\/admin\/[^/]+(.*)$/.exec(pathname);
  if (!m) {
    if (pathname === '/dashboard') return '/admin';
    return pathname;
  }
  const rest = m[1] || '';
  if (!rest || rest === '/') return '/admin';
  // /qr-codes/xyz → /qr-codes
  const segments = rest.split('/').filter(Boolean);
  if (segments[0] === 'qr-codes') return '/qr-codes';
  return `/${segments[0]}`;
}

export function parseOrgUserId(pathname: string): string | null {
  const m = /^\/admin\/([^/]+)/.exec(pathname);
  return m?.[1] || null;
}

export function homePathForUser(user: AuthUser): string {
  if (user.role === 'super_admin') return '/superadmin';
  if (user.role === 'org_admin') return orgPath(user.id, '/admin');
  if (user.role === 'staff') {
    const pages = user.allowedPages || [];
    if (pages.includes('/admin') || pages.includes('/dashboard')) return orgPath(user.id, '/admin');
    if (pages[0]) return orgPath(user.id, pages[0]);
    return orgPath(user.id, '/admin');
  }
  return '/login';
}
