import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type LogoProps = {
  compact?: boolean;
  stacked?: boolean;
  /** Hide the “Visit Hub” wordmark — mark only */
  markOnly?: boolean;
  to?: string;
  /** Light mark (for dark backgrounds). Dark mark when false. */
  light?: boolean;
  className?: string;
  markClassName?: string;
};

/**
 * Visit Hub mark — VH monogram with open door (dark / light assets).
 */
export function VisitHubMark({
  light = false,
  className,
  title = 'Visit Hub',
}: {
  light?: boolean;
  className?: string;
  title?: string;
}) {
  const src = light ? '/brand/vh-mark-dark.png' : '/brand/vh-mark-light.png';

  return (
    <img
      src={src}
      alt={title}
      width={80}
      height={80}
      draggable={false}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

export function Logo({
  compact = false,
  stacked = false,
  markOnly = false,
  to = '/',
  light = false,
  className,
  markClassName,
}: LogoProps) {
  const markSize = stacked || markOnly ? 'size-16' : 'size-10';
  const hideWordmark = compact || markOnly;

  if (stacked && !markOnly) {
    return (
      <Link to={to} className={cn('flex flex-col items-center gap-2.5', className)}>
        <VisitHubMark light={light} className={cn(markSize, 'rounded-[22%]', markClassName)} />
        <span className="text-center">
          <span
            className={cn(
              'block text-base font-semibold tracking-tight',
              light ? 'text-white' : 'text-ink'
            )}
          >
            Visit Hub
          </span>
        </span>
      </Link>
    );
  }

  const content = (
    <span className="flex items-center gap-2.5">
      <VisitHubMark light={light} className={cn(markSize, 'rounded-[22%]', markClassName)} />
      {hideWordmark ? null : (
        <span
          className={cn(
            'block text-sm font-semibold tracking-tight',
            light ? 'text-white' : 'text-ink'
          )}
        >
          Visit Hub
        </span>
      )}
    </span>
  );

  return (
    <Link to={to} className={cn('inline-flex items-center', className)}>
      {content}
    </Link>
  );
}
