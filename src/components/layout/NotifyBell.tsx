import { Notification01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  markNotifyRead,
  markNotifyReadOne,
  readNotifyFeed,
  subscribeNotify,
  type NotifyItem,
} from '../../lib/notifyStore';
import { cn } from '../../lib/cn';

type Filter = 'all' | 'unread';

export function NotifyBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<NotifyItem[]>(() => readNotifyFeed());
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.read).length;
  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((item) => !item.read) : items),
    [filter, items]
  );

  useEffect(() => {
    const refresh = () => setItems(readNotifyFeed());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    const unsub = subscribeNotify(refresh);
    return () => {
      window.clearInterval(timer);
      unsub();
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-10 place-items-center rounded-full border border-line text-fog transition hover:text-primary"
        aria-label="Notifications"
      >
        <HugeiconsIcon icon={Notification01Icon} size={18} color="currentColor" strokeWidth={1.8} />
        {unread ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute top-12 right-0 z-[80] w-80 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_16px_40px_rgba(17,24,39,0.12)]">
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button
                type="button"
                disabled={!unread}
                onClick={() => markNotifyRead()}
                className="text-xs font-medium text-primary disabled:cursor-default disabled:text-mute"
              >
                Read all
              </button>
            </div>
            <div className="mt-2 flex gap-1">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </FilterChip>
              <FilterChip active={filter === 'unread'} onClick={() => setFilter('unread')}>
                Unread{unread ? ` (${unread})` : ''}
              </FilterChip>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {visible.length ? (
              visible.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!item.read) markNotifyReadOne(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (!item.read) markNotifyReadOne(item.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer border-b border-line px-4 py-3 last:border-0 transition',
                    item.read ? 'bg-card' : 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!item.read ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    <div className={cn(!item.read ? '' : 'pl-3.5')}>
                      <p className={cn('text-sm', item.read ? 'font-medium text-ink' : 'font-semibold text-ink')}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-mute">{item.text}</p>
                      <p className="mt-1 text-[11px] text-mute">{new Date(item.at).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-mute">
                {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
        active ? 'bg-primary text-white' : 'bg-line/60 text-mute hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}
