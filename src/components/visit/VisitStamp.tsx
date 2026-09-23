import { cn } from '../../lib/cn';

export type VisitStampKind = 'completed' | 'unavailable';

export function visitStampKind(input: {
  declined?: boolean;
  ticketStatus?: string | null;
  outTime?: string | null;
  availability?: 'yes' | 'no' | null;
}): VisitStampKind | null {
  if (input.declined || input.ticketStatus === 'declined' || (input.availability === 'no' && !input.outTime)) {
    return 'unavailable';
  }
  if (input.outTime || input.ticketStatus === 'closed') return 'completed';
  return null;
}

export function VisitStamp({ kind, className }: { kind: VisitStampKind; className?: string }) {
  const completed = kind === 'completed';
  return (
    <span
      className={cn(
        'absolute top-3 right-3 z-10 rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase',
        completed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
        className
      )}
    >
      {completed ? 'Completed' : 'Not complete'}
    </span>
  );
}
