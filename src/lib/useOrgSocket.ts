import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

type VisitPayload = {
  visitor?: {
    id: string;
    ticketStatus?: string;
    waitEndsAt?: string | null;
    waitMinutes?: number | null;
    outTime?: string | null;
    outLabel?: string | null;
    [key: string]: unknown;
  };
};

function patchTicketLists(queryClient: ReturnType<typeof useQueryClient>, visitor: NonNullable<VisitPayload['visitor']>) {
  queryClient.setQueriesData({ queryKey: ['tickets'] }, (current: unknown) => {
    const data = current as
      | {
          items?: Array<Record<string, unknown> & { id: string; ticketStatus?: string }>;
          summary?: { waiting: number; confirmed: number; closed: number; total: number };
        }
      | undefined;
    if (!data?.items) return current;
    const index = data.items.findIndex((item) => item.id === visitor.id);
    if (index < 0) return current;

    const prev = data.items[index];
    const nextStatus = String(visitor.ticketStatus || prev.ticketStatus || 'waiting');
    const items = data.items.map((item, i) =>
      i === index
        ? {
            ...item,
            ...visitor,
            ticketStatus: nextStatus,
          }
        : item
    );

    const summary = data.summary
      ? (() => {
          const next = { ...data.summary! };
          const before = String(prev.ticketStatus || 'waiting');
          if (before !== nextStatus) {
            if (before === 'waiting') next.waiting = Math.max(0, next.waiting - 1);
            if (before === 'confirmed') next.confirmed = Math.max(0, next.confirmed - 1);
            if (before === 'closed') next.closed = Math.max(0, next.closed - 1);
            if (nextStatus === 'waiting') next.waiting += 1;
            if (nextStatus === 'confirmed') next.confirmed += 1;
            if (nextStatus === 'closed') next.closed += 1;
          }
          return next;
        })()
      : data.summary;

    return { ...data, items, summary };
  });

  queryClient.setQueriesData({ queryKey: ['notify-watch'] }, (current: unknown) => {
    const rows = current as Array<Record<string, unknown> & { id: string }> | undefined;
    if (!Array.isArray(rows)) return current;
    const index = rows.findIndex((item) => item.id === visitor.id);
    if (index < 0) return [{ ...visitor }, ...rows].slice(0, 50);
    return rows.map((item, i) => (i === index ? { ...item, ...visitor } : item));
  });
}

export function useOrgSocket(organizationId?: string | null) {
  const queryClient = useQueryClient();
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const socket = getSocket();
    const join = () => socket.emit('join', { organizationId });
    join();
    socket.on('connect', join);

    const scheduleListRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        void queryClient.invalidateQueries({ queryKey: ['tickets'] });
        void queryClient.invalidateQueries({ queryKey: ['notify-watch'] });
        void queryClient.invalidateQueries({ queryKey: ['visitor-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['meetings-month'] });
        void queryClient.invalidateQueries({ queryKey: ['meetings-today'] });
      }, 400);
    };

    const onVisit = (payload: VisitPayload) => {
      const visitor = payload.visitor;
      if (!visitor?.id) {
        scheduleListRefresh();
        return;
      }
      const hasRow = (() => {
        const caches = queryClient.getQueriesData({ queryKey: ['tickets'] });
        return caches.some(([, value]) => {
          const data = value as { items?: Array<{ id: string }> } | undefined;
          return Boolean(data?.items?.some((item) => item.id === visitor.id));
        });
      })();

      if (hasRow) {
        patchTicketLists(queryClient, visitor);
        void queryClient.invalidateQueries({ queryKey: ['visitor-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['meetings-today'] });
        return;
      }
      // New visitor / not on current page — refresh lists once.
      scheduleListRefresh();
    };

    socket.on('org:visit', onVisit);
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      socket.off('connect', join);
      socket.emit('leave', { organizationId });
      socket.off('org:visit', onVisit);
    };
  }, [organizationId, queryClient]);
}
