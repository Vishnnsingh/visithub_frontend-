import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Building03Icon,
  DashboardSquare01Icon,
  IdentificationIcon,
  Logout01Icon,
  QrCode01Icon,
  CheckListIcon,
  Ticket01Icon,
  UserAdd01Icon,
  UserCircleIcon,
  Notification01Icon,
  Home01Icon,
  Mail01Icon,
  Comment01Icon,
  Note01Icon,
  Payment01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { homePath, USER_ROLES } from '../../lib/auth';
import { orgPath } from '../../lib/orgRoutes';
import { useAuthStore } from '../../store/authStore';
import { useStaffAuthStore } from '../../store/staffAuthStore';
import { useSuperAuthStore } from '../../store/superAuthStore';
import { resolveAuthArea, resolveOrgSlot, setAuthArea } from '../../lib/session';
import { Logo } from '../brand/Logo';
import { HeaderClock } from './HeaderClock';
import { NotifyBell } from './NotifyBell';
import { NotifyWatch } from './NotifyWatch';

type DashboardShellProps = {
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
};

const ORG_LINK_DEFS = [
  { page: '/admin', label: 'Dashboard', icon: DashboardSquare01Icon },
  { page: '/plan', label: 'Plan', icon: Ticket01Icon },
  { page: '/staff', label: 'Add Staff', icon: UserAdd01Icon },
  { page: '/organisation', label: 'Organisation', icon: Building03Icon },
  { page: '/qr-codes', label: 'QR Codes', icon: QrCode01Icon },
  { page: '/visitor-details', label: 'Visitor details', icon: IdentificationIcon },
  { page: '/tickets', label: 'Tickets', icon: Ticket01Icon },
  { page: '/notifications', label: 'Notifications', icon: Notification01Icon },
  { page: '/home-element', label: 'Home Element', icon: Home01Icon },
  { page: '/active-fields', label: 'Active Fields', icon: CheckListIcon },
] as const;

const ADMIN_LINKS = [
  { to: '/superadmin', label: 'Dashboard', icon: DashboardSquare01Icon },
  { to: '/superadmin/payments', label: 'Payment Dashboard', icon: Payment01Icon },
  { to: '/superadmin/plans', label: 'Plans', icon: Ticket01Icon },
  { to: '/superadmin/business-types', label: 'Add Business Type', icon: Building03Icon },
  { to: '/superadmin/contact', label: 'Contact', icon: Mail01Icon },
  { to: '/superadmin/help', label: 'Help Center', icon: Comment01Icon },
  { to: '/superadmin/legal', label: 'Terms & Policy', icon: Note01Icon },
  { to: '/superadmin/landing-theme', label: 'Landing theme', icon: Home01Icon },
] as const;

export function DashboardShell({ title, subtitle, headerExtra, children }: DashboardShellProps) {
  const pathname = window.location.pathname;
  const area = resolveAuthArea(pathname);
  const isSuperArea = area === 'super';
  const orgSlot = area === 'staff' ? 'staff' : 'org_admin';

  const adminUser = useAuthStore((state) => state.user);
  const adminToken = useAuthStore((state) => state.token);
  const setAdminUser = useAuthStore((state) => state.setUser);
  const clearAdminSession = useAuthStore((state) => state.clearSession);

  const staffUser = useStaffAuthStore((state) => state.user);
  const staffToken = useStaffAuthStore((state) => state.token);
  const setStaffUser = useStaffAuthStore((state) => state.setUser);
  const clearStaffSession = useStaffAuthStore((state) => state.clearSession);

  const superUser = useSuperAuthStore((state) => state.user);
  const superToken = useSuperAuthStore((state) => state.token);
  const setSuperUser = useSuperAuthStore((state) => state.setUser);
  const clearSuperSession = useSuperAuthStore((state) => state.clearSession);

  const user = isSuperArea
    ? superUser
    : orgSlot === 'staff'
      ? staffUser
      : adminUser;
  const token = isSuperArea
    ? superToken
    : orgSlot === 'staff'
      ? staffToken
      : adminToken;
  const setUser = isSuperArea
    ? setSuperUser
    : orgSlot === 'staff'
      ? setStaffUser
      : setAdminUser;
  const clearSession = isSuperArea
    ? clearSuperSession
    : orgSlot === 'staff'
      ? clearStaffSession
      : clearAdminSession;
  const userId = user?.id || '';

  const navigate = useNavigate();
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.sessionStorage.getItem('sidebar-open');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    window.sessionStorage.setItem('sidebar-open', String(open));
  }, [open]);

  useEffect(() => {
    if (!isSuperArea) setAuthArea(resolveOrgSlot(pathname));
  }, [isSuperArea, pathname]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const mePath = isSuperArea ? '/auth/superadmin/me' : '/auth/me';
        const response = await api.get(mePath);
        const next = response.data?.data?.user;
        if (!cancelled && next) setUser(next);
      } catch {
        // keep local session
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, token, isSuperArea]);

  const orgLinks = userId
    ? ORG_LINK_DEFS.map((item) => ({
        to: orgPath(userId, item.page),
        page: item.page,
        label: item.label,
        icon: item.icon,
      }))
    : [];

  const links = isSuperArea
    ? ADMIN_LINKS.map((item) => ({ ...item, page: item.to }))
    : user?.role === USER_ROLES.ORG_ADMIN
      ? orgLinks
      : user?.role === USER_ROLES.STAFF
        ? orgLinks.filter(
            (item) =>
              item.page !== '/staff' && (user.allowedPages || []).includes(item.page)
          )
        : orgLinks;

  const handleLogout = async () => {
    try {
      await api.post(isSuperArea ? '/auth/superadmin/logout' : '/auth/logout');
    } catch {
      // continue local logout even if the request fails
    }
    clearSession();
    navigate(isSuperArea ? '/superadmin/login' : '/login', { replace: true });
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) setOpen(false);
  };

  return (
    <div className="app-bg flex h-dvh overflow-hidden text-text">
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'relative z-40 flex h-full shrink-0 flex-col overflow-visible border-r border-line bg-card transition-[width] duration-200',
          open ? 'w-72 shadow-[8px_0_30px_rgba(17,24,39,0.06)] lg:shadow-none' : 'w-[4.5rem]'
        )}
      >
        <div className={cn('flex h-full min-h-0 flex-col', open ? 'w-72' : 'w-[4.5rem]')}>
          <div className={cn('flex shrink-0 items-center py-4', open ? 'px-4' : 'justify-center px-2')}>
            <Logo compact={!open} to={homePath(user)} />
          </div>

          <nav className={cn('min-h-0 flex-1 space-y-1 overflow-y-auto py-2', open ? 'px-3' : 'px-2')}>
            {links.map((item) => (
              <SideLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                collapsed={!open}
                onClick={closeOnMobile}
              />
            ))}
          </nav>

          <div className={cn('shrink-0 space-y-1 border-t border-line py-3', open ? 'px-3' : 'px-2')}>
            <SideLink
              to="/profile"
              label="Your profile"
              icon={UserCircleIcon}
              collapsed={!open}
              onClick={closeOnMobile}
            />
            <button
              type="button"
              title="Logout"
              onClick={() => void handleLogout()}
              className={cn(
                'flex w-full items-center rounded-2xl py-2.5 text-sm font-medium text-fog transition hover:bg-primary/10 hover:text-primary',
                open ? 'gap-3 px-3' : 'justify-center px-0'
              )}
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} color="currentColor" strokeWidth={1.8} />
              {open ? 'Logout' : <span className="sr-only">Logout</span>}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="absolute top-4 right-0 z-50 grid size-8 translate-x-1/2 place-items-center rounded-full border border-line bg-card text-ink shadow-sm transition hover:bg-bg hover:text-primary"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <HugeiconsIcon
            icon={open ? ArrowLeft01Icon : ArrowRight01Icon}
            size={16}
            color="currentColor"
            strokeWidth={2}
          />
        </button>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 shrink-0 border-b border-line bg-card/85 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h1>
              {subtitle ? <p className="hidden truncate text-xs text-mute sm:block">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {headerExtra}
              <HeaderClock />
              {user?.role !== USER_ROLES.SUPER_ADMIN ? <NotifyBell /> : null}
              <HeaderProfile
                name={user?.fullName || 'Profile'}
                email={user?.email}
                onLogout={() => void handleLogout()}
              />
            </div>
          </div>
        </header>

        {user?.role !== USER_ROLES.SUPER_ADMIN ? <NotifyWatch /> : null}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function HeaderProfile({
  name,
  email,
  onLogout,
}: {
  name: string;
  email?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-white transition hover:bg-primary-deep"
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        {initials(name) || <HugeiconsIcon icon={UserCircleIcon} size={18} color="currentColor" strokeWidth={1.8} />}
      </button>

      {open ? (
        <div className="absolute top-12 right-0 z-50 w-56 overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            {email ? <p className="truncate text-xs text-mute">{email}</p> : null}
          </div>
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-fog transition hover:bg-primary/10 hover:text-primary"
          >
            <HugeiconsIcon icon={UserCircleIcon} size={16} color="currentColor" strokeWidth={1.8} />
            Your profile
          </NavLink>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-fog transition hover:bg-primary/10 hover:text-primary"
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SideLink({
  to,
  label,
  icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon: IconSvgElement;
  collapsed?: boolean;
  onClick: () => void;
}) {
  // Exact match for dashboard roots so nested pages don't keep parent active
  const end =
    to === '/superadmin' || /^\/admin\/[^/]+$/.test(to);

  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-2xl py-2.5 text-sm font-medium transition',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive ? 'bg-primary text-white shadow-sm' : 'text-fog hover:bg-primary/10 hover:text-primary'
        )
      }
    >
      <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavLink>
  );
}
