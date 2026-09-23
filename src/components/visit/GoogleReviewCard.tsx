import { ArrowRight01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/cn';

export type GoogleReviewPayload = {
  enabled: boolean;
  url: string;
  label?: string;
  hint?: string;
};

/** Prefer official Maps writeAReviewUri (!12e1) when a feature id is present. */
export function writeReviewHref(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/google\.[^/]+\/maps\/place\/\/data=!4m3!3m2!1s.+!12e1/i.test(trimmed)) return trimmed;
  const fid =
    trimmed.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/i)?.[1] ||
    trimmed.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/i)?.[1];
  if (fid) return `https://www.google.com/maps/place//data=!4m3!3m2!1s${fid}!12e1`;
  return trimmed;
}

export function openGoogleWriteReview(url: string | null | undefined) {
  const href = url ? writeReviewHref(url) : '';
  if (!href) return false;
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}

export function GoogleReviewCard({
  review,
  className,
}: {
  review: GoogleReviewPayload | null | undefined;
  className?: string;
}) {
  if (!review?.url) return null;

  const href = writeReviewHref(review.url);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mb-3 block rounded-[1.75rem] border border-line bg-card px-5 py-6 text-center shadow-[0_12px_30px_rgba(15,39,68,0.06)] transition hover:border-primary/30',
        className
      )}
    >
      <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-primary" />
      <span className="mx-auto inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3.5 py-2.5 text-white">
        <HugeiconsIcon icon={StarIcon} size={18} color="currentColor" strokeWidth={1.8} />
        <HugeiconsIcon icon={StarIcon} size={18} color="currentColor" strokeWidth={1.8} />
        <HugeiconsIcon icon={StarIcon} size={18} color="currentColor" strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">Google Review</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{review.label || 'Review on Google'}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-mute">
        {review.hint || 'Tap to open Google Write a review and rate with stars.'}
      </p>
      <span className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">
        Write a review
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={1.8} />
      </span>
    </a>
  );
}
