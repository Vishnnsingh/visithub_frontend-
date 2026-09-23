import {
  ArrowLeft01Icon,
  Delete02Icon,
  PrinterIcon,
  QrCode01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { QrImage, visitUrl } from '../components/qr/QrImage';
import { printQrCard } from '../components/qr/printQrCard';
import { api, getApiErrorMessage } from '../lib/api';
import { orgPath } from '../lib/orgRoutes';

type QrItem = {
  id: string;
  label: string;
  publicCode: string;
  organizationName: string;
  createdAt: string;
};

type QrListData = {
  total: number;
  items: QrItem[];
};

export function QrCodes() {
  const { id, userId } = useParams();
  if (id) return <QrCardView id={id} userId={userId || ''} />;
  return <QrList userId={userId || ''} />;
}

function QrList({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [count, setCount] = useState('');
  const [pending, setPending] = useState<QrItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: async () => {
      const response = await api.get('/qr');
      return response.data.data as QrListData;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const value = Number(count);
      if (!Number.isInteger(value) || value < 1 || value > 99) {
        throw new Error('Enter a number from 1 to 99');
      }
      await api.post('/qr', { count: value });
    },
    onSuccess: () => {
      toast.success('QR codes generated');
      setCount('');
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not generate QR codes')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/qr/${id}`);
    },
    onSuccess: () => {
      toast.success('QR code deleted');
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete this QR code')),
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <DashboardShell title="QR Codes" subtitle="Generate printable codes for your organisation.">
      <section className="no-print rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <form
          className="max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            generateMutation.mutate();
          }}
        >
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fog">
            How many QR codes
            <span className="text-danger" aria-hidden>*</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="relative min-w-0 flex-1">
              <HugeiconsIcon
                icon={QrCode01Icon}
                size={18}
                color="currentColor"
                strokeWidth={1.7}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mute"
              />
              <input
                className="field-input"
                inputMode="numeric"
                maxLength={2}
                pattern="[0-9]*"
                placeholder="e.g. 8"
                value={count}
                onChange={(event) => setCount(event.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </span>
            <button
              type="submit"
              disabled={generateMutation.isPending || !count}
              className="h-[3.15rem] shrink-0 rounded-full bg-primary px-5 text-sm font-semibold whitespace-nowrap text-white hover:bg-primary-deep disabled:opacity-60"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate QR codes'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-mute">Numbers only, 1 to 99. New codes continue as G1, G2…</p>
        </form>
      </section>

      {isLoading ? (
        <p className="mt-5 text-sm text-mute">Loading QR codes...</p>
      ) : error ? (
        <p className="mt-5 text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-mute">No QR codes yet. Enter how many you need, then generate.</p>
      ) : (
        <section className="mt-5">
          <div className="mb-4 no-print">
            <p className="text-sm font-semibold text-ink">{total} QR codes</p>
            <p className="text-xs text-mute">Print, cut, and place one at each location.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <article key={item.id} className="flex flex-col items-center rounded-3xl border border-line bg-card p-5 shadow-sm">
                <div className="rounded-2xl border border-line bg-white p-3">
                  <QrImage value={visitUrl(item.publicCode)} size={168} />
                </div>
                <p className="mt-4 text-base font-semibold text-ink">{item.label}</p>
                <p className="mt-0.5 font-mono text-[11px] tracking-wide text-mute">{item.publicCode}</p>
                <div className="mt-4 grid w-full grid-cols-3 gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => navigate(`${orgPath(userId, '/qr-codes')}/${item.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-2 py-2 text-xs font-semibold text-fog hover:text-primary"
                  >
                    <HugeiconsIcon icon={ViewIcon} size={14} color="currentColor" strokeWidth={1.8} />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void printQrCard(item).catch((err) => {
                        toast.error(getApiErrorMessage(err, 'Could not print this card'));
                      });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-2 py-2 text-xs font-semibold text-fog hover:text-primary"
                  >
                    <HugeiconsIcon icon={PrinterIcon} size={14} color="currentColor" strokeWidth={1.8} />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(item)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-2 py-2 text-xs font-semibold text-fog hover:text-primary"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <DeleteQrPopup
        item={pending}
        deleting={deleteMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && deleteMutation.mutate(pending.id)}
      />
    </DashboardShell>
  );
}

function QrCardView({ id, userId }: { id: string; userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['qr-codes', id],
    queryFn: async () => {
      const response = await api.get(`/qr/${id}`);
      return response.data.data as QrItem;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/qr/${id}`);
    },
    onSuccess: () => {
      toast.success('QR code deleted');
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      navigate(orgPath(userId, '/qr-codes'), { replace: true });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete this QR code')),
  });

  return (
    <DashboardShell title={data ? `Card for ${data.label}` : 'QR card'} subtitle={data ? `${data.organizationName} · ${data.publicCode}` : undefined}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => navigate(orgPath(userId, '/qr-codes'))}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fog hover:text-primary"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color="currentColor" strokeWidth={1.8} />
          Back to QR codes
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!data}
            onClick={() => {
              if (!data) return;
              void printQrCard(data).catch((err) => {
                toast.error(getApiErrorMessage(err, 'Could not print this card'));
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
          >
            <HugeiconsIcon icon={PrinterIcon} size={16} color="currentColor" strokeWidth={1.8} />
            Print this card
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fog hover:text-primary disabled:opacity-60"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} color="currentColor" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-mute">Loading card...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : data ? (
        <div className="flex justify-center">
          <QrPrintCard item={data} />
        </div>
      ) : null}

      <DeleteQrPopup
        item={confirmOpen ? data || null : null}
        deleting={deleteMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </DashboardShell>
  );
}

export function QrPrintCard({ item, compact }: { item: QrItem; compact?: boolean }) {
  const size = compact ? 168 : 220;
  return (
    <article className="qr-print-card w-full max-w-md rounded-[1.75rem] border border-dashed border-line bg-white px-8 py-10 text-center shadow-sm">
      <p className="text-base font-semibold text-ink">{item.organizationName}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{item.label}</p>
      <div className="mt-6 flex justify-center">
        <QrImage value={visitUrl(item.publicCode)} size={size} />
      </div>
      <p className="mt-6 text-sm text-fog">
        Scan QR code for visiting our {item.organizationName}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">Don&apos;t forget mark out timing</p>
    </article>
  );
}

function DeleteQrPopup({
  item,
  deleting,
  onCancel,
  onConfirm,
}: {
  item: QrItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card px-6 py-7 text-center">
        <p className="text-base font-semibold text-ink">Are you sure?</p>
        <p className="mt-1 text-sm text-mute">
          This will delete {item.label}. Printed copies of this code will stop working.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-line py-2.5 text-sm font-semibold text-fog"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
