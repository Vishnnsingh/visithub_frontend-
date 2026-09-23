import { orgPageKeyFromPathname, orgPath } from './orgRoutes';

/** Pages staff can be granted. Add Staff stays org_admin only. */
export const STAFF_DASHBOARD_ACCESS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/plan', label: 'Plan' },
  { path: '/organisation', label: 'Organisation' },
  { path: '/qr-codes', label: 'QR Codes' },
  { path: '/visitor-details', label: 'Visitor details' },
  { path: '/tickets', label: 'Tickets' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/home-element', label: 'Home Element' },
  { path: '/active-fields', label: 'Active Fields' },
] as const;

export type StaffDashboardPath = (typeof STAFF_DASHBOARD_ACCESS)[number]['path'];

function normalizePage(path: string): string {
  if (path === '/dashboard') return '/admin';
  return path;
}

export function staffHomePath(allowedPages?: string[] | null, userId?: string | null): string {
  if (!userId) return '/login';
  if (!allowedPages?.length) return orgPath(userId, '/admin');
  const pages = allowedPages.map(normalizePage);
  if (pages.includes('/admin')) return orgPath(userId, '/admin');
  return orgPath(userId, pages[0]);
}

export function staffCanOpenPath(allowedPages: string[] | undefined, pathname: string): boolean {
  if (!allowedPages?.length) return false;
  const key = orgPageKeyFromPathname(pathname);
  return allowedPages.map(normalizePage).includes(key);
}
