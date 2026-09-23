import { IdentificationIcon, Login01Icon, Logout01Icon, QrCode01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '../components/layout/DashboardShell';
import { DatePickerField } from '../components/ui/DateTimePickers';
import { SelectField } from '../components/ui/Fields';
import { api, getApiErrorMessage, publicUploadUrl } from '../lib/api';
import { cn } from '../lib/cn';

type RangeKey = 'today' | 'yesterday' | 'week' | '30' | '60' | '90' | 'all';

type VisitorRow = {
  id: string;
  visitorUid: string;
  visitorName: string | null;
  email?: string | null;
  mobileNumber: string | null;
  personToMeet: string | null;
  purpose: string | null;
  date: string | null;
  inTime: string | null;
  outTime: string | null;
  duration: string | null;
  label: string;
  outLabel: string | null;
  outPhotoFile?: string | null;
  revisit: boolean;
};

type DetailsPayload = {
  range: RangeKey;
  page: number;
  pages: number;
  limit: number;
  summary: { total: number; revisits: number; inCount: number; outCount: number };
  filters: { dates: string[]; people: string[]; gates: string[] };
  items: VisitorRow[];
};

type VisitorDetailPayload = {
  visitor: VisitorRow & {
    selfieFile: string | null;
    signatureFile: string | null;
    aadhaarFrontFile: string | null;
    aadhaarBackFile: string | null;
    outPhotoFile?: string | null;
    addressCompany: string | null;
    department: string | null;
    vehicleNumber: string | null;
    remarks: string | null;
    customValues?: Record<string, string>;
  };
  fields: { key: string; label: string; type: string }[];
  visitCount: number;
  meetCount: number;
  meetPerson: string;
  meetCounts: { person: string; count: number }[];
  history: VisitorRow[];
};

const RANGES: { id: RangeKey; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: '1 week' },
  { id: '30', label: '30 days' },
  { id: '60', label: '60 days' },
  { id: '90', label: '90 days' },
  { id: 'all', label: 'All' },
];

export function VisitorDetailsPage() {
  const [range, setRange] = useState<RangeKey>('today');
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [personToMeet, setPersonToMeet] = useState('');
  const [gate, setGate] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['visitor-details', range, page, date, personToMeet, gate],
    queryFn: async () => {
      const response = await api.get('/visitor/details', {
        params: { range, page, limit: 10, date, personToMeet, gate },
      });
      return response.data.data as DetailsPayload;
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings-today'],
    queryFn: async () => {
      const response = await api.get('/visitor/meetings');
      return (response.data.data.items || []) as Array<{ name: string; status: 'yes' | 'no' | null }>;
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const personStatusByName = useMemo(() => {
    const map = new Map<string, 'yes' | 'no' | null>();
    for (const item of meetingsQuery.data || []) {
      map.set(item.name.trim().toLowerCase(), item.status);
    }
    return map;
  }, [meetingsQuery.data]);

  const personStatusToday = (name: string | null) => {
    if (!name?.trim()) return null;
    return personStatusByName.get(name.trim().toLowerCase()) ?? null;
  };

  const filters = data?.filters;

  return (
    <DashboardShell title="Visitor details" subtitle="Filter visits by day and see in, out and revisits.">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRange(item.id);
                setPage(1);
                setDate('');
                setPersonToMeet('');
                setGate('');
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                range === item.id && !date ? 'bg-primary text-white' : 'border border-line bg-card text-fog hover:text-primary'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total visitors" value={data?.summary.total ?? 0} icon={UserMultipleIcon} />
          <SummaryCard label="Revisits" value={data?.summary.revisits ?? 0} icon={IdentificationIcon} />
          <SummaryCard label="In" value={data?.summary.inCount ?? 0} icon={Login01Icon} />
          <SummaryCard label="Out" value={data?.summary.outCount ?? 0} icon={Logout01Icon} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DatePickerField
            label="Date"
            value={date}
            placeholder="All dates"
            onChange={(value) => {
              setDate(value);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Person to meet"
            icon={UserMultipleIcon}
            value={personToMeet}
            allLabel="All people"
            options={filters?.people || []}
            onChange={(value) => {
              setPersonToMeet(value);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Gate"
            icon={QrCode01Icon}
            value={gate}
            allLabel="All gates"
            options={filters?.gates || []}
            onChange={(value) => {
              setGate(value);
              setPage(1);
            }}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-mute">Loading visitor details...</p>
        ) : error ? (
          <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
        ) : !data?.items.length ? (
          <div className="rounded-3xl border border-line bg-card px-5 py-10 text-center text-sm text-mute">
            No visitors in this period.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Visitor</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Person to meet</th>
                    <th className="px-4 py-3 font-semibold">Purpose</th>
                    <th className="px-4 py-3 font-semibold">Gate</th>
                    <th className="px-4 py-3 font-semibold">Out gate</th>
                    <th className="px-4 py-3 font-semibold">Out photo</th>
                    <th className="px-4 py-3 font-semibold">In / Out</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{item.visitorName || 'Visitor'}</p>
                        <p className="text-xs text-mute">
                          {item.email || item.visitorUid}
                          {item.revisit ? ' · Revisit' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-fog">{item.date || '—'}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          if (!item.personToMeet) return <span className="text-fog">—</span>;
                          const availability = personStatusToday(item.personToMeet);
                          return (
                            <span
                              className={cn(
                                'font-semibold',
                                availability === 'yes' ? 'text-success' : availability === 'no' ? 'text-danger' : 'text-fog'
                              )}
                            >
                              {item.personToMeet}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-fog">{item.purpose || '—'}</td>
                      <td className="px-4 py-3 text-fog">{item.label}</td>
                      <td className="px-4 py-3 text-fog">{item.outLabel || '—'}</td>
                      <td className="px-4 py-3">
                        {item.outPhotoFile ? (
                          <img src={publicUploadUrl(item.outPhotoFile) || ''} alt="Out" className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <span className="text-fog">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fog">
                        {item.inTime || '—'}
                        <span className="block text-xs text-mute">{item.outTime ? `Out ${item.outTime}` : 'Inside'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setOpenId(item.id)}
                          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          View more
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 || data.items.length > 0 ? (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                <p className="text-mute">
                  Page {data.page} of {data.pages} · {data.summary.total} visits
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pages}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {openId ? <VisitorDetailModal id={openId} onClose={() => setOpenId(null)} /> : null}
    </DashboardShell>
  );
}

function VisitorDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [historyPage, setHistoryPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['visitor-detail', id],
    queryFn: async () => {
      const response = await api.get(`/visitor/details/${id}`);
      return response.data.data as VisitorDetailPayload;
    },
  });
  const visitor = data?.visitor;
  const history = data?.history ?? [];
  const historyLimit = 10;
  const historyPages = Math.max(1, Math.ceil(history.length / historyLimit));
  const safeHistoryPage = Math.min(historyPage, historyPages);
  const pagedHistory = history.slice((safeHistoryPage - 1) * historyLimit, safeHistoryPage * historyLimit);

  useEffect(() => {
    setHistoryPage(1);
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-ink/40 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-card shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">{visitor?.visitorName || 'Visitor details'}</h2>
            <p className="text-xs text-mute">{visitor?.email || visitor?.visitorUid}</p>
            {visitor?.email && visitor?.visitorUid ? (
              <p className="text-xs text-mute">{visitor.visitorUid}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-mute">
            Close
          </button>
        </div>
        {isLoading ? (
          <p className="px-6 py-4 text-sm text-mute">Loading...</p>
        ) : error ? (
          <p className="px-6 py-4 text-sm text-danger">{getApiErrorMessage(error)}</p>
        ) : visitor ? (
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
            <div className="grid items-stretch gap-4 md:grid-cols-[minmax(220px,320px)_1fr]">
              <div className="overflow-hidden rounded-2xl border border-line bg-bg">
                {visitor.selfieFile ? (
                  <img
                    src={publicUploadUrl(visitor.selfieFile) || ''}
                    alt="Selfie"
                    className="h-full max-h-80 w-full object-contain"
                  />
                ) : (
                  <div className="grid h-64 place-items-center text-sm text-mute">No selfie</div>
                )}
              </div>
              <div className="grid content-start gap-3 sm:grid-cols-2">
                <CountCard label="Times visited" value={data.visitCount} />
                {(data.meetCounts?.length
                  ? data.meetCounts
                  : data.meetPerson
                    ? [{ person: data.meetPerson, count: data.meetCount }]
                    : []
                ).map((item) => (
                  <CountCard key={item.person} label={`Times to meet ${item.person}`} value={item.count} />
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              {data.fields.map((field) => {
                if (field.key === 'selfie') return null;
                const image =
                  field.key === 'aadhaarFront'
                    ? visitor.aadhaarFrontFile
                    : field.key === 'aadhaarBack'
                      ? visitor.aadhaarBackFile
                      : field.key === 'outPhoto'
                        ? visitor.outPhotoFile
                        : field.type === 'signature'
                          ? visitor.signatureFile
                          : field.type === 'photo' || field.type === 'upload'
                            ? visitor.customValues?.[field.key] || null
                            : null;
                const value =
                  field.key in (visitor.customValues || {})
                    ? visitor.customValues?.[field.key]
                    : String((visitor as Record<string, unknown>)[field.key] || '') || '—';
                return (
                  <div key={field.key} className="rounded-2xl border border-line px-3 py-2">
                    <dt className="text-[11px] font-semibold tracking-wide text-mute uppercase">{field.label}</dt>
                    {image ? (
                      <img src={publicUploadUrl(image) || ''} alt={field.label} className="mt-2 max-h-40 w-full rounded-xl object-contain" />
                    ) : (
                      <dd className="mt-1 font-medium text-ink break-words">{value}</dd>
                    )}
                  </div>
                );
              })}
            </dl>
            <div>
              <p className="text-sm font-semibold text-ink">History</p>
              <div className="mt-2 space-y-2">
                {pagedHistory.map((item) => (
                  <p key={item.id} className="rounded-2xl bg-bg px-3 py-2 text-xs text-fog">
                    {item.date} · In {item.inTime || '—'} ({item.label})
                    {item.outTime ? ` · Out ${item.outTime}${item.outLabel ? ` (${item.outLabel})` : ''}` : ''}
                    {item.personToMeet ? ` · Meet ${item.personToMeet}` : ''}
                    {item.duration ? ` · ${item.duration}` : ''}
                  </p>
                ))}
                {!history.length ? <p className="text-xs text-mute">No history yet.</p> : null}
              </div>
              {history.length > 0 ? (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-mute">
                    Page {safeHistoryPage} of {historyPages} · {history.length} visits
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
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  icon,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  icon: typeof UserMultipleIcon;
  value: string;
  allLabel: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      label={label}
      optional
      plain
      icon={icon}
      placeholder={allLabel}
      value={value}
      options={[{ value: '', label: allLabel }, ...options.map((option) => ({ value: option, label: option }))]}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-line bg-bg px-4 py-3">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: typeof UserMultipleIcon;
}) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-mute uppercase">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-bg text-ink">
          <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}
