import {
  Building03Icon,
  Clock01Icon,
  Delete02Icon,
  EyeIcon,
  Search01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';
import type { Tenant, TenantDetail } from '../lib/auth';
import { cn } from '../lib/cn';

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await api.get('/superadmin/tenants');
      return response.data.data as Tenant[];
    },
  });

  const detailQuery = useQuery({
    queryKey: ['tenant-detail', detailId],
    queryFn: async () => {
      const response = await api.get(`/superadmin/tenants/${detailId}`);
      return response.data.data as TenantDetail;
    },
    enabled: Boolean(detailId),
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data;
    return data.filter((tenant) =>
      [
        tenant.name,
        tenant.businessType,
        tenant.city,
        tenant.state,
        tenant.admin?.fullName,
        tenant.admin?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [data, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, data.length]);

  const activePlanCount = data.filter((t) => t.subscription?.isActive).length;
  const businessTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data) {
      const key = t.businessType || 'Other';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/superadmin/tenants/${id}/active`, { isActive });
      return response.data.data as Tenant;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success(vars.isActive ? 'Organisation activated' : 'Organisation deactivated');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/superadmin/tenants/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDetailId(null);
      toast.success('Organisation deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const onDelete = (tenant: Tenant) => {
    if (
      !window.confirm(
        `Delete “${tenant.name}”? This deactivates linked users and removes the organisation.`
      )
    ) {
      return;
    }
    deleteMutation.mutate(tenant.id);
  };

  return (
    <DashboardShell
      title="All organisations"
      subtitle="Super admin view of every business profile, plan status and usage."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total organisations" value={String(data.length)} hint="All registered tenants" />
        <Stat
          label="Active plan tenants"
          value={String(activePlanCount)}
          hint={`${data.length - activePlanCount} without active plan`}
        />
        <div className="rounded-2xl border border-line bg-card px-4 py-4">
          <p className="text-xs text-mute">Business types</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{businessTypeCounts.length}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {businessTypeCounts.slice(0, 4).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-medium text-fog"
              >
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mb-5">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          color="currentColor"
          strokeWidth={1.7}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mute"
        />
        <input
          className="field-input"
          placeholder="Search business, city, admin or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-mute">Loading tenants...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-card p-8 text-center text-sm text-mute">
          No organisation profiles yet. New create-account tenants will appear here.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold text-ink">Organisation details</h3>
              <p className="text-sm text-fog">Manage activation, deletion and full tenant insights.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Organisation</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Admin</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Expires</th>
                    <th className="px-4 py-3 font-semibold">Countdown</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paged.map((tenant) => {
                    const sub = tenant.subscription;
                    const msLeft = sub ? Math.max(0, new Date(sub.endsAt).getTime() - nowTick) : 0;
                    const planActive = Boolean(sub?.isActive && msLeft > 0);
                    return (
                      <tr key={tenant.id} className="align-top hover:bg-bg/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{tenant.name}</p>
                          <p className="text-xs text-mute">{tenant.city}</p>
                        </td>
                        <td className="px-4 py-3 text-fog">{tenant.businessType}</td>
                        <td className="px-4 py-3">
                          <p className="text-ink">{tenant.admin?.fullName || '—'}</p>
                          <p className="text-xs text-mute">{tenant.admin?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {sub ? (
                            <>
                              <p className="font-medium text-ink">{sub.planName}</p>
                              <p className="text-xs text-mute">
                                {planActive ? 'Active' : sub.status} · {formatPrice(sub.priceInr)}
                              </p>
                            </>
                          ) : (
                            <span className="text-mute">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-fog">
                          {sub ? new Date(sub.endsAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                          {sub ? formatCountdown(msLeft) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailId(tenant.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-deep"
                            >
                              <HugeiconsIcon icon={EyeIcon} size={14} color="currentColor" strokeWidth={2} />
                              View more
                            </button>
                            <button
                              type="button"
                              disabled={toggleActive.isPending}
                              onClick={() =>
                                toggleActive.mutate({ id: tenant.id, isActive: !tenant.isActive })
                              }
                              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                            >
                              {tenant.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={deleteMutation.isPending}
                              onClick={() => onDelete(tenant)}
                              className="inline-flex items-center gap-1 rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={2} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > PAGE_SIZE ? (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                <p className="text-mute">
                  Page {safePage} of {pages} · {filtered.length} organisations
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pages}
                    onClick={() => setPage((value) => Math.min(pages, value + 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-base font-semibold text-ink">Organisation cards</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {paged.map((tenant) => {
                const sub = tenant.subscription;
                const msLeft = sub ? Math.max(0, new Date(sub.endsAt).getTime() - nowTick) : 0;
                const planActive = Boolean(sub?.isActive && msLeft > 0);
                return (
                  <article
                    key={tenant.id}
                    className="rounded-3xl border border-line bg-card p-5 shadow-[0_12px_40px_rgba(17,24,39,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                          <HugeiconsIcon icon={Building03Icon} size={18} color="currentColor" strokeWidth={1.8} />
                        </span>
                        <div>
                          <h2 className="text-lg font-semibold text-ink">{tenant.name}</h2>
                          <p className="text-xs text-mute">{tenant.businessType}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          planActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : tenant.isActive
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-fog/15 text-fog'
                        )}
                      >
                        {planActive ? (
                          <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2} />
                        ) : null}
                        {planActive ? 'Plan active' : tenant.isActive ? 'No active plan' : 'Deactivated'}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-fog">
                      {[tenant.addressLine1, tenant.city, tenant.state, tenant.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>

                    {sub ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MiniStat label="Purchased" value={new Date(sub.paidAt).toLocaleDateString()} />
                        <MiniStat label="Expires" value={new Date(sub.endsAt).toLocaleDateString()} />
                        <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                          <p className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-primary uppercase">
                            <HugeiconsIcon icon={Clock01Icon} size={12} color="currentColor" strokeWidth={1.8} />
                            Countdown
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-ink">
                            {formatCountdown(msLeft)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-bg px-3 py-2 text-sm text-mute">
                        No plan purchased yet.
                      </p>
                    )}

                    <div className="mt-4 rounded-2xl bg-ink-soft px-4 py-3 text-sm">
                      <p className="text-xs text-mute">Organisation admin</p>
                      <p className="mt-1 font-medium text-ink">{tenant.admin?.fullName || '—'}</p>
                      <p className="text-mute">{tenant.admin?.email}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            {filtered.length > PAGE_SIZE ? (
              <div className="mt-4 flex items-center justify-between text-sm">
                <p className="text-mute">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
                  {filtered.length}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pages}
                    onClick={() => setPage((value) => Math.min(pages, value + 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {detailId
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setDetailId(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {detailQuery.isLoading ? (
                  <p className="text-sm text-mute">Loading details…</p>
                ) : detailQuery.error ? (
                  <p className="text-sm text-danger">{getApiErrorMessage(detailQuery.error)}</p>
                ) : detailQuery.data ? (
                  <TenantModal
                    tenant={detailQuery.data}
                    nowTick={nowTick}
                    onClose={() => setDetailId(null)}
                  />
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </DashboardShell>
  );
}

function TenantModal({
  tenant,
  nowTick,
  onClose,
}: {
  tenant: TenantDetail;
  nowTick: number;
  onClose: () => void;
}) {
  const sub = tenant.subscription;
  const msLeft = sub ? Math.max(0, new Date(sub.endsAt).getTime() - nowTick) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-mute uppercase">Organisation</p>
          <h2 className="text-2xl font-bold text-ink">{tenant.name}</h2>
          <p className="text-sm text-fog">{tenant.businessType}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Close
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Admin" value={tenant.admin?.fullName || '—'} />
        <Info label="Email" value={tenant.admin?.email || tenant.email} />
        <Info label="Phone" value={tenant.admin?.phone || tenant.contactNumber} />
        <Info
          label="Address"
          value={[tenant.addressLine1, tenant.city, tenant.state, tenant.pincode]
            .filter(Boolean)
            .join(', ')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Roles" value={String(tenant.stats?.totalRoles ?? 0)} />
        <Stat label="Staff" value={String(tenant.stats?.totalStaff ?? 0)} />
        <Stat label="Visitors" value={String(tenant.stats?.totalVisitors ?? 0)} />
        <Stat
          label="Avg visitors / day"
          value={String(tenant.stats?.avgVisitorsPerDay ?? 0)}
          hint={`${tenant.stats?.activeDays ?? 0} active days`}
        />
      </div>

      {sub ? (
        <div className="rounded-2xl border border-line bg-bg p-4">
          <p className="text-xs font-semibold tracking-wide text-mute uppercase">Current plan</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {sub.planName} · {formatPrice(sub.priceInr)}
          </p>
          <p className="mt-1 text-sm text-fog">
            Paid {new Date(sub.paidAt).toLocaleString()} · Expires {new Date(sub.endsAt).toLocaleString()}
          </p>
          <p className="mt-2 font-mono text-sm font-bold text-primary">{formatCountdown(msLeft)}</p>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-ink">Payment history</h3>
        {tenant.payments.length === 0 ? (
          <p className="mt-2 text-sm text-mute">No payments yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
            {tenant.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{p.planName}</p>
                  <p className="text-xs text-mute">
                    {p.invoiceNumber} · {new Date(p.paidAt).toLocaleString()} · {p.paymentMethod}
                  </p>
                </div>
                <p className="font-semibold text-ink">{formatPrice(p.priceInr)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-4">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-mute">{hint}</p> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-mute uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-mute uppercase">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}
