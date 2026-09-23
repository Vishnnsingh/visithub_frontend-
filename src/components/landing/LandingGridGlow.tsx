import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

/** Cursor-follow glow that lights the landing grid in soft blue */
export function LandingGridGlow({ isLight }: { isLight: boolean }) {
  const [pos, setPos] = useState({ x: -400, y: -400 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setPos({ x: event.clientX, y: event.clientY });
      setActive(true);
    };
    const onLeave = () => setActive(false);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) onLeave();
    });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const spot = `radial-gradient(circle 240px at ${pos.x}px ${pos.y}px, black 0%, transparent 72%)`;
  const softGlow = isLight
    ? `radial-gradient(circle 220px at ${pos.x}px ${pos.y}px, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0.06) 42%, transparent 70%)`
    : `radial-gradient(circle 220px at ${pos.x}px ${pos.y}px, rgba(125,211,252,0.28) 0%, rgba(56,189,248,0.1) 40%, transparent 70%)`;

  const litGrid = isLight
    ? 'linear-gradient(to right, rgba(14,165,233,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,165,233,0.55) 1px, transparent 1px)'
    : 'linear-gradient(to right, rgba(125,211,252,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,211,252,0.7) 1px, transparent 1px)';

  return (
    <>
      {/* Soft blue light under cursor */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-0 z-0 transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: softGlow }}
      />
      {/* Grid lines lit near cursor */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-0 z-0 transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          backgroundImage: litGrid,
          backgroundSize: '48px 48px',
          WebkitMaskImage: spot,
          maskImage: spot,
        }}
      />
    </>
  );
}
