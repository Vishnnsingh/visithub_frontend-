import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { readNotifySettings, showNotifyBanner } from '../../lib/notifyStore';
import { getSocket } from '../../lib/socket';
import { useOrgSocket } from '../../lib/useOrgSocket';
import { useActiveOrgAuth } from '../../lib/useActiveOrgAuth';

type WatchRow = {
  id: string;
  visitorName: string | null;
  outTime: string | null;
  waitEndsAt: string | null;
  ticketStatus: string;
};

type Snapshot = {
  id: string;
  out: boolean;
  waitEndsAt: string | null;
  ended: boolean;
};

type VisitPayload = {
  visitor?: WatchRow;
};

export function NotifyWatch() {
  const { user } = useActiveOrgAuth();
  const organizationId = user?.organizationId;
  useOrgSocket(organizationId);
  const seeded = useRef(false);
  const prev = useRef<Map<string, Snapshot>>(new Map());
  const playedIn = useRef(new Set<string>());
  const playedOut = useRef(new Set<string>());
  const { data } = useQuery({
    queryKey: ['notify-watch'],
    queryFn: async () => {
      const response = await api.get('/visitor/tickets', { params: { status: 'all', page: 1, limit: 50 } });
      return (response.data.data.items || []) as WatchRow[];
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!data) return;
    const next = new Map<string, Snapshot>();
    for (const item of data) {
      const ends = item.waitEndsAt;
      next.set(item.id, {
        id: item.id,
        out: Boolean(item.outTime),
        waitEndsAt: ends,
        ended: Boolean(ends && new Date(ends).getTime() <= Date.now()),
      });
    }
    if (!seeded.current) {
      prev.current = next;
      for (const item of data) {
        playedIn.current.add(item.id);
        if (item.outTime) playedOut.current.add(item.id);
      }
      seeded.current = true;
      return;
    }
    if (!readNotifySettings().enabled) {
      prev.current = next;
      return;
    }
    for (const item of data) {
      const before = prev.current.get(item.id);
      if (!before) {
        if (!playedIn.current.has(item.id) && !item.outTime) {
          playedIn.current.add(item.id);
          showNotifyBanner('in', 'New visitor', `${item.visitorName || 'Visitor'} checked in`);
        }
        continue;
      }
      if (!before.out && item.outTime && !playedOut.current.has(item.id)) {
        playedOut.current.add(item.id);
        showNotifyBanner('out', 'Visitor out', `${item.visitorName || 'Visitor'} left`);
      }
      const nowEnded = Boolean(item.waitEndsAt && new Date(item.waitEndsAt).getTime() <= Date.now() && !item.outTime);
      if (!before.ended && nowEnded) {
        showNotifyBanner('countdown', 'Wait time ended', `${item.visitorName || 'Visitor'} countdown finished`);
      }
    }
    prev.current = next;
  }, [data]);

  useEffect(() => {
    if (!organizationId) return;
    const socket = getSocket();
    const onVisit = (payload: VisitPayload) => {
      const visitor = payload.visitor;
      if (!visitor?.id || !readNotifySettings().enabled) return;
      const before = prev.current.get(visitor.id);
      const ends = visitor.waitEndsAt;
      const snap: Snapshot = {
        id: visitor.id,
        out: Boolean(visitor.outTime),
        waitEndsAt: ends,
        ended: Boolean(ends && new Date(ends).getTime() <= Date.now()),
      };
      if (!before) {
        if (!visitor.outTime && !playedIn.current.has(visitor.id)) {
          playedIn.current.add(visitor.id);
          showNotifyBanner('in', 'New visitor', `${visitor.visitorName || 'Visitor'} checked in`);
        }
      } else if (!before.out && visitor.outTime && !playedOut.current.has(visitor.id)) {
        playedOut.current.add(visitor.id);
        showNotifyBanner('out', 'Visitor out', `${visitor.visitorName || 'Visitor'} left`);
      }
      prev.current.set(visitor.id, { ...snap, ended: before?.ended || snap.ended });
    };
    socket.on('org:visit', onVisit);
    return () => {
      socket.off('org:visit', onVisit);
    };
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!readNotifySettings().enabled) return;
      for (const [id, snap] of prev.current) {
        if (snap.out || snap.ended || !snap.waitEndsAt) continue;
        if (new Date(snap.waitEndsAt).getTime() > Date.now()) continue;
        snap.ended = true;
        const row = data?.find((item) => item.id === id);
        showNotifyBanner('countdown', 'Wait time ended', `${row?.visitorName || 'Visitor'} countdown finished`);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data]);

  return null;
}
