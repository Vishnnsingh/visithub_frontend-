import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';

type MoneyBucket = {
  count: number;
  grossInr: number;
  gatewayFeeInr: number;
  netInr: number;
};

type PaymentStats = {
  today: MoneyBucket;
  month: MoneyBucket;
  all: MoneyBucket;
  settings: {
    feePercent: number;
    gateway: string;
    updatedAt: string;
  };
};

type PaymentRow = {
  id: string;
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  businessType: string;
  adminName: string;
  adminEmail: string;
  planName: string;
  months: number;
  grossAmountInr: number;
  gatewayFeePercent: number;
  gatewayFeeInr: number;
  netAmountInr: number;
  currency: string;
  gateway: string;
  gatewayPaymentId: string | null;
  gatewayOrderId: string | null;
  status: string;
  paidAt: string;
  invoiceNumber: string;
  createdAt: string;
};

type PaymentPage = {
  items: PaymentRow[];
  page: number;
  pages: number;
  total: number;
  limit: number;
  period: 'day' | 'month' | 'all';
};

type Period = 'day' | 'month' | 'all';

function inr(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SuperAdminPayments() {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [period]);

  const statsQuery = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const response = await api.get('/superadmin/payments/stats');
      return response.data.data as PaymentStats;
    },
  });

  const listQuery = useQuery({
    queryKey: ['admin-payments', page, period],
    queryFn: async () => {
      const response = await api.get('/superadmin/payments', {
        params: { page, limit: 10, period },
      });
      return response.data.data as PaymentPage;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin-payment-detail', detailId],
    enabled: Boolean(detailId),
    queryFn: async () => {
      const response = await api.get(`/superadmin/payments/${detailId}`);
      return response.data.data as PaymentRow;
    },
  });

  const data = listQuery.data;
  const stats = statsQuery.data;
  const closeDetail = () => setDetailId(null);

  return (
    <DashboardShell
      title="Payment Dashboard"
      subtitle="Organisation payments by day and month, with gateway fee and net received."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Today"
            bucket={stats?.today}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="This month"
            bucket={stats?.month}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="All time"
            bucket={stats?.all}
            loading={statsQuery.isLoading}
          />
        </div>

        {stats?.settings ? (
          <p className="text-sm text-fog">
            Gateway: <span className="font-semibold text-ink">{stats.settings.gateway}</span>
            {' · '}
            Fee: <span className="font-semibold text-ink">{stats.settings.feePercent}%</span>
            {' '}
            (saved on each payment for when a live gateway is connected)
          </p>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Payments</h2>
              <p className="text-sm text-fog">10 rows per page · filter by period</p>
            </div>
            <div className="flex w-fit gap-1 rounded-full bg-bg p-1">
              {(
                [
                  ['day', 'Today'],
                  ['month', 'Month'],
                  ['all', 'All'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    period === key ? 'bg-primary text-white' : 'text-fog hover:text-ink'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {listQuery.isLoading ? (
            <p className="p-6 text-sm text-fog">Loading payments…</p>
          ) : listQuery.error ? (
            <p className="p-6 text-sm text-danger">{getApiErrorMessage(listQuery.error)}</p>
          ) : !data || data.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-mute">No payments in this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Organisation</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Paid</th>
                      <th className="px-4 py-3 font-semibold">Gateway fee</th>
                      <th className="px-4 py-3 font-semibold">Net</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((row) => (
                      <tr key={row.id} className="hover:bg-bg/60">
                        <td className="px-4 py-3 text-xs text-mute whitespace-nowrap">
                          {formatWhen(row.paidAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{row.organizationName}</p>
                          <p className="text-xs text-mute">{row.businessType || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-fog">
                          {row.planName}
                          <span className="text-mute"> · {row.months} mo</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">{inr(row.grossAmountInr)}</td>
                        <td className="px-4 py-3 text-fog">
                          {inr(row.gatewayFeeInr)}
                          <span className="text-xs text-mute"> ({row.gatewayFeePercent}%)</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">{inr(row.netAmountInr)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDetailId(row.id)}
                            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                          >
                            View detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
                <p className="text-sm text-fog">
                  Page {data.page} of {data.pages} · {data.total} payment
                  {data.total === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={data.page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {detailId
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={closeDetail}
            >
              <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink">Payment detail</h3>
                    <p className="text-sm text-fog">Full amounts as stored for the gateway ledger</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>

                {detailQuery.isLoading ? (
                  <p className="text-sm text-fog">Loading…</p>
                ) : detailQuery.error ? (
                  <p className="text-sm text-danger">{getApiErrorMessage(detailQuery.error)}</p>
                ) : detailQuery.data ? (
                  <DetailBody row={detailQuery.data} />
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </DashboardShell>
  );
}

function StatCard({
  label,
  bucket,
  loading,
}: {
  label: string;
  bucket?: MoneyBucket;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-mute uppercase">{label}</p>
      {loading || !bucket ? (
        <p className="mt-3 text-sm text-fog">…</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          <p className="text-2xl font-bold text-ink">{inr(bucket.grossInr)}</p>
          <p className="text-sm text-fog">
            Fee {inr(bucket.gatewayFeeInr)} · Net{' '}
            <span className="font-semibold text-ink">{inr(bucket.netInr)}</span>
          </p>
          <p className="text-xs text-mute">
            {bucket.count} payment{bucket.count === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailBody({ row }: { row: PaymentRow }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Organisation', value: row.organizationName },
    { label: 'Business type', value: row.businessType || '—' },
    { label: 'Admin', value: row.adminName || '—' },
    { label: 'Admin email', value: row.adminEmail || '—' },
    { label: 'Plan', value: `${row.planName} (${row.months} month${row.months === 1 ? '' : 's'})` },
    { label: 'Invoice', value: row.invoiceNumber },
    { label: 'Paid at', value: formatWhen(row.paidAt) },
    { label: 'Status', value: row.status },
    { label: 'Gateway', value: row.gateway },
    { label: 'Gross paid', value: inr(row.grossAmountInr) },
    {
      label: 'Gateway fee',
      value: `${inr(row.gatewayFeeInr)} (${row.gatewayFeePercent}%)`,
    },
    { label: 'Net received', value: inr(row.netAmountInr) },
    { label: 'Gateway payment ID', value: row.gatewayPaymentId || '— (set when live gateway connects)' },
    { label: 'Gateway order ID', value: row.gatewayOrderId || '—' },
  ];

  return (
    <dl className="space-y-3">
      {rows.map((item) => (
        <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-2 sm:grid-cols-[9rem_1fr]">
          <dt className="text-sm text-mute">{item.label}</dt>
          <dd className="text-sm font-medium break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
