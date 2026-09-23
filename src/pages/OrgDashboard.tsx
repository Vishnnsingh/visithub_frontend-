import { ArrowLeft01Icon, ArrowRight01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { TodayVisitorsChart } from '../components/dashboard/TodayVisitorsChart';
import { api, getApiErrorMessage } from '../lib/api';
import type { AuthUser, Organization } from '../lib/auth';
import { cn } from '../lib/cn';
import { useActiveOrgAuth } from '../lib/useActiveOrgAuth';

type DashboardResponse = {
  user: AuthUser;
  organization: Organization | null;
};

type MeetingStatus = 'yes' | 'no' | null;
type MeetingApiStatus = 'yes' | 'no' | 'soon';

type MeetingItem = { name: string; status: MeetingStatus; label: string };

type TodayVisitor = {
  id: string;
  visitorName: string | null;
  personToMeet: string | null;
  selfieFile: string | null;
  inTime: string | null;
  label: string;
};

type VisitorDashboard = {
  date: string;
  meetings: { date: string; items: MeetingItem[] };
  visitors: TodayVisitor[];
};

const STATUS_OPTIONS = [
  { value: 'soon' as const, label: 'Update shortly' },
  { value: 'yes' as const, label: 'Yes' },
  { value: 'no' as const, label: 'Not' },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toApiStatus(status: MeetingStatus): MeetingApiStatus {
  if (status === 'yes') return 'yes';
  if (status === 'no') return 'no';
  return 'soon';
}

function statusTone(status: MeetingStatus) {
  if (status === 'yes') return 'text-success';
  if (status === 'no') return 'text-danger';
  return 'text-mute';
}

function statusDot(status: MeetingStatus) {
  if (status === 'yes') return 'bg-success';
  if (status === 'no') return 'bg-danger';
  return 'bg-mute';
}

function indiaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function padDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function OrgDashboard() {
  const queryClient = useQueryClient();
  const { user: sessionUser } = useActiveOrgAuth();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const today = useMemo(() => indiaToday(), []);
  const [calCursor, setCalCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState(today);

  const { data } = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: async () => {
      const response = await api.get('/auth/dashboard');
      return response.data.data as DashboardResponse;
    },
  });
  const visitorQuery = useQuery({
    queryKey: ['visitor-dashboard'],
    queryFn: async () => {
      const response = await api.get('/visitor/dashboard');
      return response.data.data as VisitorDashboard;
    },
  });
  const monthKey = `${calCursor.year}-${String(calCursor.month + 1).padStart(2, '0')}`;
  const calendarQuery = useQuery({
    queryKey: ['meetings-month', monthKey],
    queryFn: async () => {
      const response = await api.get('/visitor/meetings', { params: { month: monthKey } });
      return response.data.data as { month: string; days: Record<string, MeetingItem[]> };
    },
  });

  const refreshMeetings = () => {
    queryClient.invalidateQueries({ queryKey: ['visitor-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['meetings-month'] });
    queryClient.invalidateQueries({ queryKey: ['meetings-today'] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const saveMeeting = useMutation({
    mutationFn: async ({
      name,
      status,
      date,
    }: {
      name: string;
      status: MeetingApiStatus;
      date?: string;
    }) => {
      await api.put('/visitor/meetings', { name, status, date });
    },
    onSuccess: () => {
      toast.success('Availability updated');
      refreshMeetings();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update availability')),
  });

  const addPerson = useMutation({
    mutationFn: async (name: string) => {
      await api.post('/visitor/meetings', { name });
    },
    onSuccess: () => {
      toast.success('Person added');
      setNewName('');
      refreshMeetings();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not add person')),
  });

  const removePerson = useMutation({
    mutationFn: async (name: string) => {
      await api.delete('/visitor/meetings', { data: { name } });
    },
    onSuccess: () => {
      toast.success('Person removed');
      refreshMeetings();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove person')),
  });

  const organization = data?.organization;
  const meetings = visitorQuery.data?.meetings.items || [];
  const visitors = visitorQuery.data?.visitors || [];
  const monthDays = calendarQuery.data?.days || {};
  const dayPeople = monthDays[selectedDate] || meetings;
  const firstWeekday = new Date(calCursor.year, calCursor.month, 1).getDay();
  const totalDays = daysInMonth(calCursor.year, calCursor.month);

  const openDay = (iso: string) => {
    setSelectedDate(iso);
    setDayOpen(true);
  };

  return (
    <DashboardShell title={organization?.name || sessionUser?.fullName || 'Dashboard'} subtitle="Today’s meetings and visitors">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Person to meet</h2>
              <p className="mt-1 text-xs text-mute">Only names you add here show in the visitor dropdown and calendar.</p>
            </div>
            <button
              type="button"
              onClick={() => setPeopleOpen(true)}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-fog hover:text-primary"
            >
              View person meet
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="field-input min-w-0 flex-1 px-3! py-2! pl-3! text-sm"
              value={newName}
              maxLength={80}
              placeholder="Add person name"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const value = newName.trim();
                  if (value) addPerson.mutate(value);
                }
              }}
            />
            <button
              type="button"
              disabled={addPerson.isPending || !newName.trim()}
              onClick={() => {
                const value = newName.trim();
                if (value) addPerson.mutate(value);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {addPerson.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>

          {visitorQuery.isLoading ? (
            <p className="mt-4 text-sm text-mute">Loading...</p>
          ) : !meetings.length ? (
            <p className="mt-4 text-sm text-mute">No meeting person yet. Add a name above.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {meetings.slice(0, 8).map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  <span className={cn('size-1.5 rounded-full', statusDot(item.status))} />
                  {item.name}
                </span>
              ))}
              {meetings.length > 8 ? (
                <button type="button" onClick={() => setPeopleOpen(true)} className="text-xs font-semibold text-primary">
                  +{meetings.length - 8} more
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Availability calendar</h2>
              <p className="mt-1 text-xs text-mute">Click a day to open details and change Yes / Not / Update shortly.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCalCursor((current) => {
                    const next = new Date(current.year, current.month - 1, 1);
                    return { year: next.getFullYear(), month: next.getMonth() };
                  })
                }
                className="grid size-9 place-items-center rounded-full border border-line text-fog hover:text-primary"
                aria-label="Previous month"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              </button>
              <p className="min-w-36 text-center text-sm font-semibold text-ink">{monthLabel(calCursor.year, calCursor.month)}</p>
              <button
                type="button"
                onClick={() =>
                  setCalCursor((current) => {
                    const next = new Date(current.year, current.month + 1, 1);
                    return { year: next.getFullYear(), month: next.getMonth() };
                  })
                }
                className="grid size-9 place-items-center rounded-full border border-line text-fog hover:text-primary"
                aria-label="Next month"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <p key={day} className="py-1 text-center text-[10px] font-semibold tracking-wide text-mute uppercase">
                {day}
              </p>
            ))}
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: totalDays }).map((_, index) => {
              const day = index + 1;
              const iso = padDate(calCursor.year, calCursor.month, day);
              return (
                <DayCell
                  key={iso}
                  day={day}
                  iso={iso}
                  people={monthDays[iso] || []}
                  selected={selectedDate === iso && dayOpen}
                  isToday={today === iso}
                  onSelect={() => openDay(iso)}
                />
              );
            })}
          </div>
        </section>

        <TodayVisitorsChart visitors={visitors} meetings={meetings} />
      </div>

      {peopleOpen
        ? createPortal(
            <PeopleTableModal
              title="Person to meet"
              subtitle="Added names only. Change today’s status or remove a name."
              date={today}
              people={meetings}
              newName={newName}
              setNewName={setNewName}
              pending={saveMeeting.isPending || addPerson.isPending || removePerson.isPending}
              showAdd
              showRemove
              onClose={() => setPeopleOpen(false)}
              onAdd={() => {
                const value = newName.trim();
                if (value) addPerson.mutate(value);
              }}
              onStatus={(name, status) => saveMeeting.mutate({ name, status })}
              onRemove={(name) => removePerson.mutate(name)}
            />,
            document.body
          )
        : null}

      {dayOpen
        ? createPortal(
            <PeopleTableModal
              title="Day availability"
              subtitle={selectedDate === today ? 'Today' : selectedDate}
              date={selectedDate}
              people={dayPeople}
              newName={newName}
              setNewName={setNewName}
              pending={saveMeeting.isPending}
              showAdd={false}
              showRemove={false}
              onClose={() => setDayOpen(false)}
              onAdd={() => undefined}
              onStatus={(name, status) => saveMeeting.mutate({ name, status, date: selectedDate })}
              onRemove={() => undefined}
            />,
            document.body
          )
        : null}
    </DashboardShell>
  );
}

function PeopleTableModal({
  title,
  subtitle,
  date,
  people,
  newName,
  setNewName,
  pending,
  showAdd,
  showRemove,
  onClose,
  onAdd,
  onStatus,
  onRemove,
}: {
  title: string;
  subtitle: string;
  date: string;
  people: MeetingItem[];
  newName: string;
  setNewName: (value: string) => void;
  pending: boolean;
  showAdd: boolean;
  showRemove: boolean;
  onClose: () => void;
  onAdd: () => void;
  onStatus: (name: string, status: MeetingApiStatus) => void;
  onRemove: (name: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-10000 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-mute">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-mute">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {showAdd ? (
            <div className="mb-4 flex gap-2">
              <input
                className="field-input min-w-0 flex-1 px-3! py-2! pl-3! text-sm"
                value={newName}
                maxLength={80}
                placeholder="Add person name"
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onAdd();
                  }
                }}
              />
              <button
                type="button"
                disabled={pending || !newName.trim()}
                onClick={onAdd}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add
              </button>
            </div>
          ) : null}

          {!people.length ? (
            <p className="py-10 text-center text-sm text-mute">No added people yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Person</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Change</th>
                    {showRemove ? <th className="px-4 py-3 font-semibold">Remove</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {people.map((item) => (
                    <tr key={`${date}-${item.name}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('size-2 shrink-0 rounded-full', statusDot(item.status))} />
                          <span className="font-medium text-ink">{item.name}</span>
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 text-xs font-semibold', statusTone(item.status))}>{item.label}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((option) => {
                            const active = toApiStatus(item.status) === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                disabled={pending}
                                onClick={() => onStatus(item.name, option.value)}
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60',
                                  active
                                    ? option.value === 'yes'
                                      ? 'bg-success text-white'
                                      : option.value === 'no'
                                        ? 'bg-danger text-white'
                                        : 'bg-primary text-white'
                                    : 'border border-line text-fog hover:border-primary hover:text-primary'
                                )}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      {showRemove ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onRemove(item.name)}
                            className="grid size-8 place-items-center rounded-full border border-line text-danger hover:bg-danger/10 disabled:opacity-60"
                            aria-label={`Remove ${item.name}`}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  day,
  iso,
  people,
  selected,
  isToday,
  onSelect,
}: {
  day: number;
  iso: string;
  people: MeetingItem[];
  selected: boolean;
  isToday: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const cellRef = useRef<HTMLButtonElement>(null);
  const preview = people.slice(0, 3);
  const extra = Math.max(0, people.length - preview.length);

  const placeTip = () => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 220;
    setTipPos({
      top: rect.bottom + 8,
      left: Math.min(window.innerWidth - width - 8, Math.max(8, rect.left + rect.width / 2 - width / 2)),
    });
  };

  return (
    <>
      <button
        ref={cellRef}
        type="button"
        onClick={onSelect}
        onMouseEnter={() => {
          placeTip();
          setHover(true);
        }}
        onMouseLeave={() => setHover(false)}
        className={cn(
          'flex min-h-16 flex-col items-stretch gap-0.5 rounded-xl px-1.5 py-1 text-left transition',
          selected ? 'bg-primary text-white' : 'bg-bg text-ink hover:bg-primary/10',
          isToday && !selected && 'ring-1 ring-primary/40'
        )}
      >
        <span className={cn('text-[11px] font-semibold', selected ? 'text-white' : 'text-ink')}>{day}</span>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {preview.map((item) => (
            <div key={item.name} className="flex items-center gap-1">
              <span className={cn('size-1.5 shrink-0 rounded-full', statusDot(item.status), selected && 'ring-1 ring-white/50')} />
              <span className={cn('truncate text-[9px] font-medium leading-tight', selected ? 'text-white/90' : 'text-fog')}>
                {item.name}
              </span>
            </div>
          ))}
          {extra > 0 ? (
            <p className={cn('text-[9px] font-semibold', selected ? 'text-white/70' : 'text-mute')}>+{extra}</p>
          ) : null}
        </div>
      </button>
      {hover && people.length
        ? createPortal(
            <div
              className="pointer-events-none fixed z-10001 w-[220px] rounded-2xl border border-line bg-card p-3 shadow-[0_16px_40px_rgba(17,24,39,0.14)]"
              style={{ top: tipPos.top, left: tipPos.left }}
            >
              <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">{iso}</p>
              <p className="mt-1 text-[11px] text-mute">Click for details</p>
              <div className="mt-2 space-y-1.5">
                {people.map((item) => (
                  <div key={item.name} className="flex items-start gap-2">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', statusDot(item.status))} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <p className={cn('text-xs font-semibold', statusTone(item.status))}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
