import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export function CenteredOverlay({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return createPortal(
    <div className={cn('fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/40 px-4 py-6', className)}>
      {children}
    </div>,
    document.body
  );
}
