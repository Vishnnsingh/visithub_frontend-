import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export function PullToRefresh({
  onRefresh,
  resetKey,
  children,
}: {
  onRefresh: () => Promise<void>;
  resetKey?: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  onRefreshRef.current = onRefresh;

  const setPull = (value: number) => {
    offsetRef.current = value;
    setOffset(value);
  };

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const reset = () => {
      pulling.current = false;
      setPull(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current) return;
      if (node.scrollTop > 0) return;
      startY.current = event.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      if (node.scrollTop > 0) {
        reset();
        return;
      }
      const distance = event.touches[0].clientY - startY.current;
      if (distance <= 0) {
        setPull(0);
        return;
      }
      if (event.cancelable) event.preventDefault();
      setPull(Math.min(88, distance * 0.45));
    };

    const onTouchEnd = () => {
      if (!pulling.current || refreshingRef.current) {
        reset();
        return;
      }
      const shouldRefresh = offsetRef.current >= 56;
      pulling.current = false;
      if (!shouldRefresh) {
        setPull(0);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      setPull(56);
      void onRefreshRef
        .current()
        .catch(() => undefined)
        .finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        });
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
        style={{ opacity: offset > 8 || refreshing ? 1 : 0 }}
      >
        <span
          className={cn(
            'grid size-8 place-items-center rounded-full border-2 border-line border-t-primary bg-card shadow-[0_6px_16px_rgba(15,39,68,0.10)]',
            (refreshing || offset >= 56) && 'animate-spin'
          )}
          style={
            refreshing || offset >= 56
              ? undefined
              : { transform: `rotate(${Math.min(270, offset * 4)}deg)` }
          }
          aria-hidden
        />
      </div>
      <div
        ref={scrollerRef}
        className={cn('min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4')}
        style={{
          transform: `translateY(${offset}px)`,
          transition: pulling.current ? 'none' : 'transform 180ms ease',
          overscrollBehaviorY: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
}
