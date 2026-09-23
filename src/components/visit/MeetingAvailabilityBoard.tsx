import { Calendar03Icon, Clock01Icon, Refresh01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/cn';

export type MeetingBoardItem = {
  name: string;
  status: 'yes' | 'no' | null;
  label: string;
  nextAvailableDate?: string | null;
  nextAvailableInDays?: number | null;
};

export type MeetingBoardPayload = {
  date: string;
  items: MeetingBoardItem[];
};

function formatBoardDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  return { day, weekday };
}

function formatNextAvailableDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatUpdatedAt() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function nextLine(item: MeetingBoardItem) {
  if (item.status === 'yes') return 'Available today';
  if (item.status == null) return 'Status will be updated shortly';
  if (item.nextAvailableDate && item.nextAvailableInDays != null) {
    const when = formatNextAvailableDate(item.nextAvailableDate);
    if (item.nextAvailableInDays === 1) return `Next available tomorrow · ${when}`;
    return `Next available in ${item.nextAvailableInDays} days · ${when}`;
  }
  return 'Next available date not set on calendar';
}

function statusMeta(status: MeetingBoardItem['status']) {
  if (status === 'yes') {
    return {
      pill: 'Available',
      pillClass: 'bg-success/15 text-success',
      avatarClass: 'bg-success/15 text-success',
      detailClass: 'text-success',
      icon: 'yes' as const,
    };
  }
  if (status === 'no') {
    return {
      pill: 'Not Available',
      pillClass: 'bg-danger/15 text-danger',
      avatarClass: 'bg-danger/15 text-danger',
      detailClass: 'text-danger',
      icon: 'no' as const,
    };
  }
  return {
    pill: 'Update shortly',
    pillClass: 'bg-mute/15 text-mute',
    avatarClass: 'bg-mute/15 text-mute',
    detailClass: 'text-mute',
    icon: 'soon' as const,
  };
}

export function MeetingAvailabilityBoard({
  board,
  organizationName,
  className,
}: {
  board: MeetingBoardPayload | null | undefined;
  organizationName?: string | null;
  className?: string;
}) {
  if (!board?.items?.length) return null;

  const orgTitle = organizationName?.trim() || 'Organisation';
  const stamped = formatBoardDate(board.date);
  const dateLabel = typeof stamped === 'string' ? stamped : `${stamped.day}`;
  const weekdayLabel = typeof stamped === 'string' ? '' : stamped.weekday;

  return (
    <div
      className={cn(
        'mb-3 overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[0_12px_30px_rgba(15,39,68,0.06)]',
        className
      )}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-ink uppercase sm:text-lg">{orgTitle}</h2>
            <p className="mt-0.5 text-xs font-semibold text-mute">Notice Board</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-fog">
            <HugeiconsIcon icon={Calendar03Icon} size={14} color="currentColor" strokeWidth={1.8} />
            <span className="leading-tight">
              {dateLabel}
              {weekdayLabel ? (
                <>
                  <span className="text-mute"> · </span>
                  Today
                  <span className="block text-[10px] font-medium text-mute">{weekdayLabel}</span>
                </>
              ) : null}
            </span>
          </div>
        </div>

        <div className="mt-5 text-center">
          <span className="mx-auto mb-2 block h-0.5 w-8 rounded-full bg-primary" />
          <p className="text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">Notice board</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-ink">Who’s available today?</h3>
          <p className="mt-1 text-xs text-mute">Live from today’s calendar · Yes / Not / Update shortly</p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {board.items.map((item) => {
            const meta = statusMeta(item.status);
            const initial = (item.name.trim().charAt(0) || '?').toUpperCase();
            const detail = nextLine(item);
            return (
              <li
                key={item.name}
                className="flex items-center gap-3 rounded-2xl border border-line bg-bg/80 px-3.5 py-3"
              >
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold',
                    meta.avatarClass
                  )}
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                      <p className="truncate text-[11px] font-medium text-mute">Person to meet</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        meta.pillClass
                      )}
                    >
                      {meta.icon === 'yes' ? (
                        <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2.2} />
                      ) : meta.icon === 'no' ? (
                        <span className="text-[10px] font-bold">✕</span>
                      ) : (
                        <HugeiconsIcon icon={Clock01Icon} size={12} color="currentColor" strokeWidth={1.8} />
                      )}
                      {meta.pill}
                    </span>
                  </div>
                  <p className={cn('mt-1.5 flex items-center gap-1.5 text-[11px] font-medium', meta.detailClass)}>
                    {meta.icon === 'yes' ? (
                      <span className="size-1.5 rounded-full bg-success" />
                    ) : meta.icon === 'no' ? (
                      <HugeiconsIcon icon={Calendar03Icon} size={12} color="currentColor" strokeWidth={1.8} />
                    ) : (
                      <HugeiconsIcon icon={Clock01Icon} size={12} color="currentColor" strokeWidth={1.8} />
                    )}
                    <span className="truncate">{detail}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-line pt-3">
          <LegendDot tone="bg-success" label="Yes — available today" />
          <LegendDot tone="bg-danger" label="Not — see next date" />
          <LegendDot tone="bg-mute" label="Update shortly" />
        </div>
      </div>

      <div className="space-y-2 border-t border-line bg-primary/5 px-5 py-3">
        <div className="flex min-w-0 items-center justify-center gap-2 text-center">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-white">
            <HugeiconsIcon icon={Calendar03Icon} size={14} color="currentColor" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">Data is synced with live calendar</p>
            <p className="text-[11px] text-mute">Keep your visit plans updated.</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-mute">
          <HugeiconsIcon icon={Refresh01Icon} size={14} color="currentColor" strokeWidth={1.8} />
          Last updated Today, {formatUpdatedAt()}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-mute">
      <span className={cn('size-2 rounded-full', tone)} />
      {label}
    </span>
  );
}
