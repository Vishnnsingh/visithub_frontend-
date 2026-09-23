import {
  ArrowDown01Icon,
  Clock01Icon,
  Tick02Icon,
  Ticket01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { PaymentStep } from '../components/signup/PaymentStep';
import { api, getApiErrorMessage } from '../lib/api';
import { USER_ROLES } from '../lib/auth';
import { cn } from '../lib/cn';
import { useActiveOrgAuth } from '../lib/useActiveOrgAuth';

type SubRecord = {
  id: string;
  planName: string;
  months: number;
  priceInr: number;
  status: 'active' | 'expired';
  startsAt: string;
  endsAt: string;
  paidAt: string;
  invoiceNumber: string;
  isActive: boolean;
  msRemaining: number;
  daysRemaining: number;
};

type StatusPayload = {
  active: SubRecord | null;
  hasActivePlan: boolean;
  activePlanCount: number;
  totalMonths: number;
  coverageEndsAt: string | null;
  coverageStartsAt: string | null;
  activePlans: SubRecord[];
  history: SubRecord[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function OrgPlanPage() {
  const { user } = useActiveOrgAuth();
  const isAdmin = user?.role === USER_ROLES.ORG_ADMIN;
  const queryClient = useQueryClient();
  const [showBuy, setShowBuy] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_LIMIT = 10;

  const statusQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscription/status');
      return response.data.data as StatusPayload;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const active = statusQuery.data?.active || null;
  const history = statusQuery.data?.history || [];
  const hasActive = Boolean(statusQuery.data?.hasActivePlan && active);
  const activePlanCount = statusQuery.data?.activePlanCount || 0;
  const totalMonths = statusQuery.data?.totalMonths || active?.months || 0;
  const coverageEndsAt = statusQuery.data?.coverageEndsAt || active?.endsAt || null;

  const historyPages = Math.max(1, Math.ceil(history.length / HISTORY_LIMIT));
  const safeHistoryPage = Math.min(historyPage, historyPages);
  const pagedHistory = history.slice(
    (safeHistoryPage - 1) * HISTORY_LIMIT,
    safeHistoryPage * HISTORY_LIMIT
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [history.length]);

  const msLeft = useMemo(() => {
    if (!coverageEndsAt) return 0;
    return Math.max(0, new Date(coverageEndsAt).getTime() - nowTick);
  }, [coverageEndsAt, nowTick]);

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get(`/subscription/invoice/${id}`, { responseType: 'blob' });
      return { blob: response.data as Blob, id };
    },
    onSuccess: ({ blob, id }) => {
      const row = history.find((h) => h.id === id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row?.invoiceNumber || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not download invoice')),
  });

  return (
    <DashboardShell
      title="Plan & billing"
      subtitle="Active subscription, countdown, invoices and purchase history."
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {!hasActive ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-lg font-semibold">Plan required for activation</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
              Your organisation subscription is inactive or has expired. Purchase a plan to restore full
              dashboard access for your admin account and all assigned staff roles.
            </p>
            {isAdmin ? (
              <button
                type="button"
                className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
                onClick={() => setShowBuy(true)}
              >
                Purchase a plan
              </button>
            ) : (
              <p className="mt-3 text-sm font-medium">
                Please contact your organisation admin to renew the plan.
              </p>
            )}
          </div>
        ) : null}

        {active ? (
          <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-mute uppercase">Current plan</p>
                <h2 className="mt-1 text-2xl font-bold text-ink">{active.planName}</h2>
                <p className="mt-1 text-sm text-fog">
                  Latest purchase {formatPrice(active.priceInr)} · {activePlanCount} active plan
                  {activePlanCount === 1 ? '' : 's'} · {totalMonths} month
                  {totalMonths === 1 ? '' : 's'} total
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                  hasActive ? 'bg-emerald-100 text-emerald-800' : 'bg-fog/20 text-fog'
                )}
              >
                <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2} />
                {hasActive ? 'Active' : 'Expired'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-bg p-4">
                <p className="text-xs font-medium text-mute">Paid on</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {new Date(active.paidAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-bg p-4">
                <p className="text-xs font-medium text-mute">Final expires on</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {coverageEndsAt ? new Date(coverageEndsAt).toLocaleString() : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <HugeiconsIcon icon={Clock01Icon} size={14} color="currentColor" strokeWidth={1.8} />
                  Time remaining (all plans)
                </p>
                <p className="mt-1 font-mono text-lg font-bold tracking-tight text-ink">
                  {formatCountdown(msLeft)}
                </p>
              </div>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg"
                onClick={() => setShowBuy((v) => !v)}
              >
                {showBuy ? 'Hide plans' : 'Extend / buy another plan'}
              </button>
            ) : null}
          </div>
        ) : null}

        {showBuy && isAdmin ? (
          <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
            <PaymentStep
              onSuccess={() => {
                setShowBuy(false);
                queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
              }}
            />
          </div>
        ) : null}

        <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Ticket01Icon} size={18} color="currentColor" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold text-ink">Billing history</h3>
          </div>
          <p className="mt-1 text-sm text-fog">
            Invoices for every plan purchase. Extended plans stay active until the final expiry.
          </p>

          {statusQuery.isLoading ? (
            <p className="mt-4 text-sm text-fog">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="mt-4 text-sm text-fog">No purchases yet.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-bg text-xs font-semibold tracking-wide text-mute uppercase">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Paid on</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {pagedHistory.map((row) => (
                      <tr key={row.id} className="bg-card">
                        <td className="px-4 py-3 font-semibold text-ink">{row.planName}</td>
                        <td className="px-4 py-3 text-fog">{row.invoiceNumber}</td>
                        <td className="px-4 py-3 text-fog">{new Date(row.paidAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-fog whitespace-nowrap">
                          {new Date(row.startsAt).toLocaleDateString()} →{' '}
                          {new Date(row.endsAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{formatPrice(row.priceInr)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                              row.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-fog/15 text-fog'
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                            disabled={downloadMutation.isPending}
                            onClick={() => downloadMutation.mutate(row.id)}
                          >
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              size={14}
                              color="currentColor"
                              strokeWidth={2}
                            />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <p className="text-mute">
                  Showing {(safeHistoryPage - 1) * HISTORY_LIMIT + 1}–
                  {Math.min(safeHistoryPage * HISTORY_LIMIT, history.length)} of {history.length} ·
                  Page {safeHistoryPage} of {historyPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safeHistoryPage <= 1}
                    onClick={() => setHistoryPage((value) => Math.max(1, value - 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safeHistoryPage >= historyPages}
                    onClick={() => setHistoryPage((value) => Math.min(historyPages, value + 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
