import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../lib/cn';

type MeetingStatus = 'yes' | 'no' | null;

type TodayVisitor = {
  id: string;
  visitorName: string | null;
  personToMeet: string | null;
  selfieFile: string | null;
  inTime: string | null;
  label: string;
};

type MeetingItem = { name: string; status: MeetingStatus; label: string };

type ChartKind = 'bars3d' | 'area' | 'donut' | 'radial';

const CHART_OPTIONS: { id: ChartKind; label: string; hint: string }[] = [
  { id: 'bars3d', label: '3D bars', hint: 'Visitors by person · today’s Yes / Not' },
  { id: 'area', label: 'Flow', hint: 'Check-ins by hour · availability mix' },
  { id: 'donut', label: 'Share', hint: 'Person mix · color = today’s status' },
  { id: 'radial', label: 'Pulse', hint: 'Radial load · color = today’s status' },
];

const STATUS_COLOR = {
  yes: '#22c55e',
  no: '#dc2626',
  soon: '#9ca3af',
} as const;

const STATUS_TOP = {
  yes: '#4ade80',
  no: '#f87171',
  soon: '#d1d5db',
} as const;

const STATUS_SIDE = {
  yes: '#15803d',
  no: '#991b1b',
  soon: '#6b7280',
} as const;

const LEGEND = [
  { key: 'yes' as const, label: 'Yes', meaning: 'Available today', color: STATUS_COLOR.yes, symbol: '●' },
  { key: 'no' as const, label: 'Not', meaning: 'Not available today', color: STATUS_COLOR.no, symbol: '●' },
  { key: 'soon' as const, label: 'Update shortly', meaning: 'Status not set yet', color: STATUS_COLOR.soon, symbol: '●' },
];

function personKey(name: string | null) {
  return (name || 'Unassigned').trim() || 'Unassigned';
}

function norm(name: string) {
  return name.trim().toLowerCase();
}

function statusOf(name: string, meetings: MeetingItem[]): MeetingStatus {
  const match = meetings.find((item) => norm(item.name) === norm(name));
  return match?.status ?? null;
}

function statusKey(status: MeetingStatus): 'yes' | 'no' | 'soon' {
  if (status === 'yes') return 'yes';
  if (status === 'no') return 'no';
  return 'soon';
}

function statusLabel(status: MeetingStatus) {
  if (status === 'yes') return 'Yes';
  if (status === 'no') return 'Not';
  return 'Update shortly';
}

function fillFor(status: MeetingStatus) {
  return STATUS_COLOR[statusKey(status)];
}

function hourFromInTime(inTime: string | null) {
  if (!inTime) return null;
  const match = inTime.trim().match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
}

type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
};

function Bar3DShape(props: BarShapeProps) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const width = props.width ?? 0;
  const height = props.height ?? 0;
  const fill = props.fill || STATUS_COLOR.soon;
  if (width <= 0 || height <= 0) return null;

  const depth = Math.min(10, Math.max(5, width * 0.28));
  const skew = depth * 0.55;
  const key =
    fill === STATUS_COLOR.yes ? 'yes' : fill === STATUS_COLOR.no ? 'no' : ('soon' as const);

  return (
    <g>
      <path
        d={`M${x + width},${y} L${x + width + depth},${y - skew} L${x + width + depth},${y + height - skew} L${x + width},${y + height} Z`}
        fill={STATUS_SIDE[key]}
        opacity={0.92}
      />
      <path
        d={`M${x},${y} L${x + skew},${y - depth} L${x + width + skew},${y - depth} L${x + width},${y} Z`}
        fill={STATUS_TOP[key]}
        opacity={0.98}
      />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
      <rect x={x} y={y} width={width} height={Math.min(8, height * 0.12)} fill="#fff" opacity={0.18} />
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    name?: string;
    color?: string;
    payload?: { fullName?: string; statusLabel?: string; status?: MeetingStatus };
  }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-2xl border border-line bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{row?.fullName || label}</p>
      {row?.statusLabel ? (
        <p className="mb-1 text-fog">
          Today:{' '}
          <span
            className={cn(
              'font-semibold',
              row.status === 'yes' ? 'text-success' : row.status === 'no' ? 'text-danger' : 'text-mute'
            )}
          >
            {row.statusLabel}
          </span>
        </p>
      ) : null}
      {payload.map((entry, index) => (
        <p key={`${entry.name}-${index}`} className="text-fog">
          <span className="mr-1 inline-block size-2 rounded-full" style={{ background: entry.color || '#111827' }} />
          {entry.name || 'Value'}: <span className="font-semibold text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TodayVisitorsChart({
  visitors,
  meetings,
}: {
  visitors: TodayVisitor[];
  meetings: MeetingItem[];
}) {
  const [chart, setChart] = useState<ChartKind>('bars3d');

  const byPerson = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of visitors) {
      const key = personKey(item.personToMeet);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => {
        const status = name === 'Unassigned' ? null : statusOf(name, meetings);
        return {
          name: name.length > 12 ? `${name.slice(0, 11)}…` : name,
          fullName: name,
          count,
          status,
          statusLabel: statusLabel(status),
          fill: fillFor(status),
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [visitors, meetings]);

  const byHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: formatHour(hour),
      count: 0,
      yes: 0,
      no: 0,
      soon: 0,
    }));
    for (const item of visitors) {
      const hour = hourFromInTime(item.inTime);
      if (hour == null) continue;
      hours[hour].count += 1;
      const status = statusOf(personKey(item.personToMeet), meetings);
      hours[hour][statusKey(status)] += 1;
    }
    const active = hours.map((row, index) => (row.count > 0 ? index : -1)).filter((index) => index >= 0);
    if (!active.length) return hours.slice(8, 20);
    const start = Math.max(0, active[0] - 1);
    const end = Math.min(23, active[active.length - 1] + 1);
    return hours.slice(start, end + 1);
  }, [visitors, meetings]);

  const peak = byHour.reduce((best, row) => (row.count > best.count ? row : best), byHour[0] || { label: '—', count: 0 });
  const availableCount = byPerson.filter((row) => row.status === 'yes').length;
  const unavailableCount = byPerson.filter((row) => row.status === 'no').length;

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Today’s visitors</h2>
          <p className="mt-1 text-xs text-mute">Colors follow today’s Yes / Not · pick a graph type.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHART_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              onClick={() => setChart(option.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                chart === option.id ? 'bg-primary text-white' : 'border border-line bg-bg text-fog hover:text-primary'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!visitors.length ? (
        <p className="px-5 pb-5 text-sm text-mute">No visitors today.</p>
      ) : (
        <>
          <div className="mx-5 mb-4 grid gap-2 sm:grid-cols-4">
            <StatChip label="Check-ins" value={String(visitors.length)} />
            <StatChip label="People met" value={String(byPerson.length)} />
            <StatChip label="Available (Yes)" value={String(availableCount)} tone="yes" />
            <StatChip
              label={chart === 'area' ? 'Peak hour' : 'Not available'}
              value={chart === 'area' ? `${peak.label} · ${peak.count}` : String(unavailableCount)}
              tone={chart === 'area' ? undefined : 'no'}
            />
          </div>

          <div
            className="relative mx-5 mb-4 h-72 overflow-hidden rounded-3xl border border-line"
            style={{
              background:
                'radial-gradient(520px 220px at 12% 0%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(420px 200px at 88% 100%, rgba(220,38,38,0.08), transparent 55%), linear-gradient(165deg, #f8fafc 0%, #eef2f7 48%, #e8edf5 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.05) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                transform: 'perspective(700px) rotateX(12deg) scale(1.08)',
                transformOrigin: 'center bottom',
              }}
            />
            <div className="relative h-full px-2 pt-3 pb-1">
              {chart === 'bars3d' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPerson} margin={{ top: 18, right: 18, left: -8, bottom: 8 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 6" stroke="rgba(17,24,39,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                    <Bar dataKey="count" name="Visitors" shape={<Bar3DShape />} maxBarSize={42}>
                      {byPerson.map((entry) => (
                        <Cell key={entry.fullName} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}

              {chart === 'area' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={byHour} margin={{ top: 12, right: 18, left: -8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="flowYes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={STATUS_COLOR.yes} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={STATUS_COLOR.yes} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="flowNo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={STATUS_COLOR.no} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={STATUS_COLOR.no} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="flowSoon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={STATUS_COLOR.soon} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={STATUS_COLOR.soon} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="rgba(17,24,39,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="yes" name="Yes" stackId="1" stroke={STATUS_COLOR.yes} strokeWidth={2} fill="url(#flowYes)" />
                    <Area type="monotone" dataKey="no" name="Not" stackId="1" stroke={STATUS_COLOR.no} strokeWidth={2} fill="url(#flowNo)" />
                    <Area type="monotone" dataKey="soon" name="Update shortly" stackId="1" stroke={STATUS_COLOR.soon} strokeWidth={2} fill="url(#flowSoon)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}

              {chart === 'donut' ? (
                <div className="relative h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byPerson}
                        dataKey="count"
                        nameKey="fullName"
                        innerRadius="58%"
                        outerRadius="78%"
                        paddingAngle={3}
                        cornerRadius={6}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {byPerson.map((entry) => (
                          <Cell key={entry.fullName} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-ink">{visitors.length}</p>
                      <p className="text-xs text-mute">today</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {chart === 'radial' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={byPerson.slice(0, 6)}
                    innerRadius="22%"
                    outerRadius="90%"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, Math.max(...byPerson.map((row) => row.count), 1)]} tick={false} />
                    <RadialBar dataKey="count" background={{ fill: 'rgba(17,24,39,0.06)' }} cornerRadius={8}>
                      {byPerson.slice(0, 6).map((entry) => (
                        <Cell key={entry.fullName} fill={entry.fill} />
                      ))}
                    </RadialBar>
                    <Tooltip content={<ChartTooltip />} />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="mx-5 mb-3 flex flex-wrap gap-2">
            {byPerson.slice(0, 8).map((item) => (
              <span
                key={item.fullName}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-fog"
              >
                <span className="size-2.5 rounded-full" style={{ background: item.fill }} />
                {item.fullName}
                <span className="text-mute">{item.count}</span>
                <span
                  className={cn(
                    'font-semibold',
                    item.status === 'yes' ? 'text-success' : item.status === 'no' ? 'text-danger' : 'text-mute'
                  )}
                >
                  {item.statusLabel}
                </span>
              </span>
            ))}
          </div>

          <div className="mx-5 mb-5 rounded-2xl border border-line bg-bg/70 px-3 py-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-mute uppercase">Symbols · today’s calendar</p>
            <div className="flex flex-wrap gap-3">
              {LEGEND.map((item) => (
                <div key={item.key} className="inline-flex items-center gap-2 text-xs text-fog">
                  <span
                    className="grid size-5 place-items-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: item.color }}
                    aria-hidden
                  >
                    {item.key === 'yes' ? '✓' : item.key === 'no' ? '✕' : '…'}
                  </span>
                  <span>
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="text-mute"> — {item.meaning}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: 'yes' | 'no' }) {
  return (
    <div className="rounded-2xl border border-line bg-bg/80 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-mute uppercase">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate text-sm font-semibold',
          tone === 'yes' ? 'text-success' : tone === 'no' ? 'text-danger' : 'text-ink'
        )}
      >
        {value}
      </p>
    </div>
  );
}
