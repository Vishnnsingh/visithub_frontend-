import { staffHomePath } from './dashboardAccess';
import { orgPath } from './orgRoutes';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  STAFF: 'staff',
} as const;

export type AuthRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AuthRole;
  organizationId: string | null;
  staffRoleId?: string | null;
  staffCode?: string | null;
  allowedPages?: string[];
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  contactNumber: string;
  email: string;
  website: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  adminUserId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Tenant = Organization & {
  admin: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: AuthRole;
  } | null;
  /** Org-specific override; null = use global Plans default */
  customMonthlyPriceInr?: number | null;
  /** Resolved rate this org sees for Custom purchases */
  effectiveMonthlyPriceInr?: number;
  /** Per catalog plan (1 mo / 6 mo / 1 yr …) prices for this org */
  catalogPlanPrices?: Array<{
    planId: string;
    name: string;
    months: number;
    globalPriceInr: number;
    orgPriceInr: number | null;
    effectivePriceInr: number;
  }>;
  subscription?: {
    id: string;
    planName: string;
    months: number;
    priceInr: number;
    status: 'active' | 'expired';
    paidAt: string;
    startsAt: string;
    endsAt: string;
    invoiceNumber: string;
    isActive: boolean;
    msRemaining: number;
  } | null;
  stats?: {
    totalRoles: number;
    totalStaff: number;
    totalActiveStaff: number;
    totalVisitors: number;
    avgVisitorsPerDay: number;
    activeDays: number;
  };
};

export type TenantDetail = Tenant & {
  payments: Array<{
    id: string;
    planName: string;
    months: number;
    priceInr: number;
    status: string;
    paidAt: string;
    startsAt: string;
    endsAt: string;
    invoiceNumber: string;
    paymentMethod: string;
  }>;
};

export function homePath(user: AuthUser | null | undefined): string {
  if (user?.role === USER_ROLES.SUPER_ADMIN) return '/superadmin';
  if (user?.role === USER_ROLES.ORG_ADMIN) return orgPath(user.id, '/admin');
  if (user?.role === USER_ROLES.STAFF) return staffHomePath(user.allowedPages, user.id);
  return '/login';
}

export function roleLabel(role: string): string {
  if (role === USER_ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === USER_ROLES.ORG_ADMIN) return 'Organisation Admin';
  return role;
}
