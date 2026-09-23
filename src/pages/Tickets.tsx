import { CheckmarkCircle02Icon, Clock01Icon, MoreVerticalIcon, Note01Icon, Refresh01Icon, Tick02Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage, publicUploadUrl } from '../lib/api';
import { cn } from '../lib/cn';

type TicketStatus = 'waiting' | 'confirmed' | 'closed';

type TicketRow = {
  id: string;
  visitorUid: string;
  visitorName: string | null;
  personToMeet: string | null;
  selfieFile: string | null;
  inTime: string | null;
  outTime: string | null;
  outLabel: string | null;
  outPhotoFile: string | null;
  label: string;
  ticketStatus: TicketStatus;
  waitMinutes: number | null;
  waitEndsAt: string | null;
  ticketId?: string;
  rating?: number | null;
  closedByName?: string | null;
  closedByRole?: string | null;
  closeType?: 'checkout' | 'force' | 'auto' | null;
  canForceClose?: boolean;
  declined?: boolean;
};

type TicketsPayload = {
  date: string;
  page: number;
  pages: number;
  summary: { waiting: number; confirmed: number; closed: number; total: number };
  defaultWaitMinutes?: number | null;
  items: TicketRow[];
};

const CARDS: {
  id: TicketStatus | 'all';
  label: string;
  key: keyof TicketsPayload['summary'];
  icon: typeof Ticket01Icon;
  hint: string;
}[] = [
  { id: 'all', label: 'All tickets', key: 'total', icon: Ticket01Icon, hint: 'Click to view details of all tickets' },
  { id: 'waiting', label: 'Waiting tickets', key: 'waiting', icon: Clock01Icon, hint: 'Click to view waiting ticket details' },
  { id: 'confirmed', label: 'Confirmed', key: 'confirmed', icon: CheckmarkCircle02Icon, hint: 'Click to view confirmed ticket details' },
  { id: 'closed', label: 'Closed tickets', key: 'closed', icon: Tick02Icon, hint: 'Click to view closed ticket details' },
];

export function TicketsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus | 'all'>('all');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tickets', status, page, day],
    queryFn: async () => {
      const response = await api.get('/visitor/tickets', { params: { status, page, limit: 10, day } });
      return response.data.data as TicketsPayload;
    },
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
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

  const settingsMutation = useMutation({
    mutationFn: async (defaultWaitMinutes: number | null) => {
      await api.put('/visitor/tickets/settings', { defaultWaitMinutes });
    },
    onSuccess: () => {
      toast.success('Set counter timer saved for new visitors');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save counter timer')),
  });

  const waitAllMutation = useMutation({
    mutationFn: async (waitMinutes: number | null) => {
      const response = await api.put('/visitor/tickets/wait-all', { waitMinutes });
      return response.data.data as { updatedCount?: number };
    },
    onSuccess: (data) => {
      toast.success(
        data?.updatedCount
          ? `Timer updated on ${data.updatedCount} open visitor${data.updatedCount === 1 ? '' : 's'}`
          : 'No open visitors to update'
      );
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-dashboard'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update all visitors')),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, minutes }: { id: string; action: 'wait' | 'yes' | 'no' | 'close'; minutes?: number }) => {
      await api.put(`/visitor/tickets/${id}`, { action, minutes });
    },
    onSuccess: () => {
      toast.success('Ticket updated');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['meetings-today'] });
      queryClient.invalidateQueries({ queryKey: ['meetings-month'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update ticket')),
  });

  return (
    <DashboardShell
      title="Tickets"
      subtitle={day === 'yesterday' ? 'Waiting, confirmed and closed visitor meetings for yesterday.' : 'Waiting, confirmed and closed visitor meetings for today.'}
      headerExtra={<NotesPopup />}
    >
      {refreshing
        ? createPortal(
            <div className="fixed inset-0 z-[10000] grid place-items-center bg-white/70">
              <span className="size-11 animate-spin rounded-full border-4 border-line border-t-primary" />
            </div>,
            document.body
          )
        : null}
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDay(item.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  day === item.id ? 'bg-primary text-white' : 'border border-line bg-card text-fog hover:text-primary'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                const started = Date.now();
                void Promise.all([
                  refetch(),
                  queryClient.invalidateQueries({ queryKey: ['meetings-today'] }),
                ]).finally(() => {
                  window.setTimeout(() => setRefreshing(false), Math.max(0, 450 - (Date.now() - started)));
                });
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-fog transition hover:text-primary disabled:opacity-60"
            >
              <HugeiconsIcon icon={Refresh01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              Refresh
            </button>
            <DefaultTimerButton
              value={data?.defaultWaitMinutes ?? 10}
              pending={settingsMutation.isPending || waitAllMutation.isPending}
              onSaveNew={(minutes) => settingsMutation.mutate(minutes)}
              onSaveAll={(minutes) => waitAllMutation.mutate(minutes)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setStatus(card.id);
                setPage(1);
              }}
              className={cn(
                'group relative cursor-pointer rounded-3xl border p-5 text-left shadow-sm transition hover:shadow-md',
                status === card.id ? 'border-primary bg-primary text-white' : 'border-line bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-center justify-between">
                <p className={cn('text-xs font-semibold tracking-wide uppercase', status === card.id ? 'text-white/70' : 'text-mute')}>
                  {card.label}
                </p>
                <span className={cn('grid size-9 place-items-center rounded-xl', status === card.id ? 'bg-white/15' : 'bg-bg text-ink')}>
                  <HugeiconsIcon icon={card.icon} size={18} color="currentColor" strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold">{data?.summary[card.key] ?? 0}</p>
              <span className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-max max-w-[15rem] -translate-x-1/2 rounded-2xl bg-ink px-3 py-2 text-center text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {card.hint}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-mute">Loading tickets...</p>
        ) : error ? (
          <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
        ) : !data?.items.length ? (
          <div className="rounded-3xl border border-line bg-card px-5 py-10 text-center text-sm text-mute">
            No tickets in this list.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ticket ID</th>
                    <th className="px-4 py-3 font-semibold">Visitor</th>
                    <th className="px-4 py-3 font-semibold">Person to meet</th>
                    <th className="px-4 py-3 font-semibold">In time</th>
                    <th className="px-4 py-3 font-semibold">Out time</th>
                    <th className="px-4 py-3 font-semibold">Gate in</th>
                    <th className="px-4 py-3 font-semibold">Gate out</th>
                    <th className="px-4 py-3 font-semibold">Closed by</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Ticket status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((item) => {
                    const isClosed = Boolean(item.outTime || item.ticketStatus === 'closed');
                    return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium tracking-wide text-ink">{item.ticketId || item.visitorUid}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.selfieFile ? (
                            <img
                              src={publicUploadUrl(item.selfieFile) || ''}
                              alt=""
                              className="size-12 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="grid size-12 place-items-center rounded-xl bg-bg text-xs text-mute">No photo</span>
                          )}
                          <div>
                            <p className="font-medium text-ink">{item.visitorName || 'Visitor'}</p>
                            <p className="text-xs text-mute">{item.visitorUid}</p>
                          </div>
                        </div>
                      </td>
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
                      <td className="px-4 py-3 text-fog">{item.inTime || '—'}</td>
                      <td className="px-4 py-3 text-fog">{item.outTime || '—'}</td>
                      <td className="px-4 py-3 text-fog">{item.label || '—'}</td>
                      <td className="px-4 py-3 text-fog">{item.outLabel || '—'}</td>
                      <td className="px-4 py-3 text-fog">
                        {item.closeType === 'checkout' ? (
                          <span>Visitor</span>
                        ) : item.closeType === 'auto' ? (
                          <span>Auto</span>
                        ) : item.closedByName ? (
                          <span>
                            {item.closedByName}
                            {item.closedByRole ? <span className="block text-xs text-mute">{item.closedByRole}</span> : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-fog">{item.rating ? `${item.rating}/5` : '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            isClosed ? 'bg-bg text-mute' : 'bg-ink-soft text-ink'
                          )}
                        >
                          {isClosed ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isClosed ? (
                          <p className="text-xs font-semibold text-mute">—</p>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {item.waitEndsAt ? (
                              <Countdown endsAt={item.waitEndsAt} minutes={item.waitMinutes} />
                            ) : null}
                            <TicketWaitMenu
                              pending={actionMutation.isPending}
                              showTimes
                              gateIn={item.label}
                              gateOut={item.outLabel}
                              onWait={(minutes) => actionMutation.mutate({ id: item.id, action: 'wait', minutes })}
                              onYes={() => actionMutation.mutate({ id: item.id, action: 'yes' })}
                              onNo={() => actionMutation.mutate({ id: item.id, action: 'no' })}
                              onClose={() => actionMutation.mutate({ id: item.id, action: 'close' })}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.pages > 1 || data.items.length > 0 ? (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                <p className="text-mute">
                  Page {data.page} of {data.pages}
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
    </DashboardShell>
  );
}

function TicketWaitMenu({
  pending,
  showTimes,
  gateIn,
  gateOut,
  onWait,
  onYes,
  onNo,
  onClose,
}: {
  pending: boolean;
  showTimes: boolean;
  gateIn?: string | null;
  gateOut?: string | null;
  onWait: (minutes: number) => void;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [custom, setCustom] = useState(false);
  const [minutes, setMinutes] = useState('15');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const placeMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 208;
    const menuHeight = custom ? 320 : 280;
    const openUp = rect.bottom + menuHeight > window.innerHeight - 12 && rect.top > menuHeight;
    setMenuPos({
      top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth)),
    });
  };

  const toggleMenu = () => {
    if (!open) {
      setCustom(false);
      placeMenu();
    }
    setOpen((current) => !current);
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => placeMenu();
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onReposition);
    document.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
  }, [open, custom]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={pending}
        className="grid size-8 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
        aria-label="Wait actions"
        aria-expanded={open}
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={16} color="currentColor" strokeWidth={1.8} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-[0_16px_40px_rgba(17,24,39,0.16)]"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <div className="border-b border-line px-3 py-2 text-xs text-mute">
                <p>
                  Gate in <span className="font-semibold text-ink">{gateIn || '—'}</span>
                </p>
                <p className="mt-0.5">
                  Gate out <span className="font-semibold text-ink">{gateOut || '—'}</span>
                </p>
              </div>
              {showTimes ? (
                <>
                  {[2, 5, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        onWait(value);
                        setOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-fog hover:bg-primary/10 hover:text-primary"
                    >
                      Wait {value} min
                    </button>
                  ))}
                  {custom ? (
                    <div className="flex items-center gap-2 border-t border-line px-3 py-2">
                      <input
                        className="field-input min-w-0 flex-1 !px-2 !py-1.5 !pl-2 text-sm"
                        value={minutes}
                        inputMode="numeric"
                        autoFocus
                        onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          onWait(Number(minutes) || 15);
                          setOpen(false);
                        }}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Set
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCustom(true)}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-fog hover:bg-primary/10 hover:text-primary"
                    >
                      Custom
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onYes();
                      setOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-success hover:bg-bg"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onNo();
                      setOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-danger hover:bg-bg"
                  >
                    Not
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setConfirmClose(true);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-bg"
              >
                Close ticket
              </button>
            </div>,
            document.body
          )
        : null}

      {confirmClose
        ? createPortal(
            <div className="fixed inset-0 z-[10000] grid place-items-center bg-ink/40 px-4 py-6">
              <div className="w-full max-w-sm rounded-3xl border border-line bg-card p-5 shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
                <p className="text-lg font-semibold text-ink">Are you sure?</p>
                <p className="mt-2 text-sm text-mute">This will close the ticket manually and mark status as Closed.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmClose(false)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-fog"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onClose();
                      setConfirmClose(false);
                    }}
                    className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? 'Closing...' : 'Close ticket'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function DefaultTimerButton({
  value,
  pending,
  onSaveNew,
  onSaveAll,
}: {
  value: number | null;
  pending?: boolean;
  onSaveNew: (minutes: number | null) => void;
  onSaveAll: (minutes: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'all'>('new');
  const [custom, setCustom] = useState(false);
  const [minutes, setMinutes] = useState(String(value || 10));

  const save = (next: number | null) => {
    if (mode === 'all') onSaveAll(next);
    else onSaveNew(next);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode('new');
          setCustom(false);
          setMinutes(String(value || 10));
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-semibold text-fog hover:text-primary"
      >
        <HugeiconsIcon icon={Clock01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        Set counter timer{value ? ` · ${value}m` : ' · Off'}
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 px-4 py-6">
              <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Set counter timer</h2>
                    <p className="mt-1 text-sm text-mute">
                      New visitors get the default when they arrive. Change all open visitors here, or one ticket from
                      the three-dot menu.
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-mute">
                    Close
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className={cn(
                      'rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold',
                      mode === 'new' ? 'border-primary bg-primary text-white' : 'border-line text-fog'
                    )}
                  >
                    New visitors
                    <span className={cn('mt-0.5 block font-normal', mode === 'new' ? 'text-white/80' : 'text-mute')}>
                      Default when someone first arrives
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('all')}
                    className={cn(
                      'rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold',
                      mode === 'all' ? 'border-primary bg-primary text-white' : 'border-line text-fog'
                    )}
                  >
                    All open visitors
                    <span className={cn('mt-0.5 block font-normal', mode === 'all' ? 'text-white/80' : 'text-mute')}>
                      Change countdown on everyone now
                    </span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[2, 5, 10].map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={pending}
                      onClick={() => save(item)}
                      className={cn(
                        'rounded-full border py-2.5 text-sm font-semibold',
                        mode === 'new' && value === item
                          ? 'border-primary bg-primary text-white'
                          : 'border-line text-fog hover:text-primary'
                      )}
                    >
                      {item} min
                    </button>
                  ))}
                </div>
                {custom ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      className="field-input min-w-0 flex-1 !px-3 !py-2 !pl-3 text-sm"
                      value={minutes}
                      inputMode="numeric"
                      autoFocus
                      onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => save(Number(minutes) || 10)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      Set
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCustom(true)}
                    className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-semibold text-fog hover:text-primary"
                  >
                    Custom
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(null)}
                  className="mt-2 w-full rounded-full border border-line py-2.5 text-sm font-semibold text-mute"
                >
                  Off
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function NotesPopup() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-semibold text-fog hover:text-primary"
      >
        <HugeiconsIcon icon={Note01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        Notes
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 px-4 py-6">
              <div className="w-full max-w-lg rounded-3xl bg-card p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink">Notes</h2>
                  <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-mute">
                    Close
                  </button>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-fog">
                  <li>Organisation admins and staff with an assigned role can open this dashboard and use every section except Add Staff.</li>
                  <li>Set counter timer: choose New visitors (default when someone first arrives) or All open visitors (change everyone’s countdown now). One ticket still uses the three-dot menu.</li>
                  <li>When the countdown ends the ticket stays open. Use the three-dot menu to set the timer again, extend it, or mark No. Close ticket is only for force-close after one hour inside.</li>
                  <li>The table and three-dot menu show Gate in and Gate out. Tickets still open after 3 days close automatically (System · 3-day auto-close).</li>
                </ul>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Countdown({ endsAt, minutes }: { endsAt: string | null; minutes: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  const remaining = remainingLabel(endsAt);
  return (
    <p className="min-w-14 text-right text-sm font-semibold text-primary">
      {remaining === 'Ready' ? 'Time over' : remaining}
      {minutes ? <span className="block text-[11px] font-normal text-mute">{minutes} min set</span> : null}
    </p>
  );
}

function remainingLabel(endsAt: string | null) {
  if (!endsAt) return 'Confirmed';
  const left = new Date(endsAt).getTime() - Date.now();
  if (left <= 0) return 'Ready';
  const total = Math.ceil(left / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
