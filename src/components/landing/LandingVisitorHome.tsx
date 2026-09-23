import {
  Cancel01Icon,
  Home01Icon,
  InstagramIcon,
  Linkedin01Icon,
  StarIcon,
  Tick02Icon,
  WhatsappIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useIsLandingLight } from './landingTheme';

const HOME_BULLETS = [
  'One QR — visitors see who is available today',
  'Leave a Google review from the same Home',
  'Follow socials — no logo desk run for reviews or follows',
  'Returning visitors reopen the same home anytime',
] as const;

function Cell({
  title,
  text,
  children,
  className = '',
}: {
  title: string;
  text: string;
  children: ReactNode;
  className?: string;
}) {
  const isLight = useIsLandingLight();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className={`flex min-h-0 flex-col p-6 sm:p-8 lg:p-10 ${className}`}
    >
      <h3
        className={cn(
          'text-lg font-semibold tracking-tight sm:text-xl',
          isLight ? 'text-[#111827]' : 'text-white'
        )}
      >
        {title}
      </h3>
      <p className={cn('mt-2 max-w-md text-sm leading-6', isLight ? 'text-[#111827]/72' : 'text-white/45')}>
        {text}
      </p>
      <div className="mt-auto pt-6">{children}</div>
    </motion.div>
  );
}

export function LandingVisitorHome() {
  const isLight = useIsLandingLight();

  return (
    <section
      id="visitor-home"
      className={cn(
        'relative w-full scroll-mt-20 overflow-hidden',
        isLight ? 'bg-transparent' : 'bg-transparent'
      )}
    >
      <div className="relative w-full px-6 pt-24 pb-16 sm:px-10 sm:pt-28 lg:px-16 lg:pt-32 lg:pb-24 xl:px-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-3xl text-center sm:mb-14"
        >
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide ring-1',
              isLight
                ? 'bg-[#111827]/5 text-[#111827]/78 ring-black/10'
                : 'bg-white/5 text-white/55 ring-white/10'
            )}
          >
            <HugeiconsIcon icon={Home01Icon} size={13} color="currentColor" strokeWidth={1.8} />
            Visitor Home
          </span>
          <p
            className={cn(
              'mt-6 text-base font-bold leading-7 sm:text-lg sm:leading-8',
              isLight ? 'text-[#111827]' : 'text-white'
            )}
          >
            Single scanner at the gate — availability, reviews and follows live on visitor Home. Guests don’t
            need to return only to ask “who is free?” or hunt a review QR near the logo.
          </p>
          <ul className="mt-8 space-y-3">
            {HOME_BULLETS.map((line, index) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + index * 0.06 }}
                className={cn(
                  'text-sm leading-7 sm:text-base sm:leading-8',
                  isLight ? 'text-[#111827]/85' : 'text-white/70'
                )}
              >
                {line}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="grid lg:grid-cols-3">
          <Cell
            title="Notice board"
            text="Who’s available today — Yes / Not / Update shortly. Visitors check before coming again."
            className=""
          >
            <div
              className={cn(
                'mx-auto max-w-sm space-y-3 rounded-xl p-4',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn('text-sm font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                    Your Organisation
                  </p>
                  <p className={cn('text-[11px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>Notice Board</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] ring-1',
                    isLight
                      ? 'bg-[#111827]/5 text-[#111827]/75 ring-black/10'
                      : 'bg-white/5 text-white/50 ring-white/10'
                  )}
                >
                  Today
                </span>
              </div>
              <p className={cn('text-center text-sm font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                Who’s available today?
              </p>
              <p className={cn('text-center text-[11px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>
                Live from today’s calendar
              </p>
              {[
                { name: 'Deepak', ok: true, tip: 'Available today' },
                { name: 'Rahul', ok: false, tip: 'Next available tomorrow' },
              ].map((row) => (
                <div
                  key={row.name}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1',
                    isLight ? 'bg-[#f4f4f5] ring-black/10' : 'bg-[#121212] ring-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-full text-xs font-bold',
                      isLight ? 'bg-[#111827]/10 text-[#111827]' : 'bg-white/10 text-white'
                    )}
                  >
                    {row.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', isLight ? 'text-[#111827]' : 'text-white')}>{row.name}</p>
                    <p className={cn('text-[10px]', isLight ? 'text-[#111827]/65' : 'text-white/35')}>Person to meet</p>
                    <p className={`mt-0.5 text-[11px] ${row.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.tip}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      row.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    <HugeiconsIcon
                      icon={row.ok ? Tick02Icon : Cancel01Icon}
                      size={11}
                      color="currentColor"
                      strokeWidth={2}
                    />
                    {row.ok ? 'Available' : 'Not Available'}
                  </span>
                </div>
              ))}
              <div
                className={cn(
                  'flex justify-center gap-4 pt-1 text-[10px]',
                  isLight ? 'text-[#111827]/65' : 'text-white/35'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> Yes — available
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-400" /> Not — next date
                </span>
              </div>
            </div>
          </Cell>

          <Cell
            title="Google review"
            text="Connect your Google review link — visitors tap Write a review from Home. No separate visit to the logo desk."
            className=""
          >
            <div
              className={cn(
                'mx-auto max-w-60 rounded-2xl px-5 py-6 text-center ring-1',
                isLight ? 'border border-black/10 bg-white ring-black/10' : 'bg-[#0c0c0c] ring-white/10'
              )}
            >
              <div className="mx-auto mb-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">
                {[0, 1, 2].map((i) => (
                  <HugeiconsIcon key={i} icon={StarIcon} size={12} color="#111827" strokeWidth={1.8} />
                ))}
              </div>
              <p
                className={cn(
                  'text-[10px] font-semibold tracking-[0.16em] uppercase',
                  isLight ? 'text-[#111827]/70' : 'text-white/40'
                )}
              >
                Google review
              </p>
              <p className={cn('mt-1 text-base font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                Review on Google
              </p>
              <p className={cn('mt-2 text-[11px] leading-5', isLight ? 'text-[#111827]/70' : 'text-white/40')}>
                Tap to open Google — write a review and rate with stars.
              </p>
              <div
                className={cn(
                  'mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold',
                  isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'
                )}
              >
                Write a review
                <span aria-hidden>›</span>
              </div>
            </div>
          </Cell>

          <Cell
            title="Stay connected"
            text="Instagram, WhatsApp, LinkedIn, YouTube — follow from the same QR Home. Org updates without chasing visitors."
            className=""
          >
            <div
              className={cn(
                'mx-auto max-w-sm rounded-2xl px-5 py-6 text-center ring-1',
                isLight ? 'border border-black/10 bg-white ring-black/10' : 'bg-[#0c0c0c] ring-white/10'
              )}
            >
              <p className="text-[10px] font-semibold tracking-[0.16em] text-rose-300/80 uppercase">Stay connected</p>
              <p
                className={cn(
                  'mt-2 font-[Outfit,sans-serif] text-xl font-semibold',
                  isLight ? 'text-[#111827]' : 'text-white'
                )}
              >
                Follow your org
              </p>
              <p
                className={cn(
                  'mt-2 text-[11px] leading-5 italic',
                  isLight ? 'text-[#111827]/70' : 'text-white/40'
                )}
              >
                Updates, announcements, and support — links you set in Home Element.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                {[
                  { icon: InstagramIcon, label: 'Instagram' },
                  { icon: WhatsappIcon, label: 'WhatsApp' },
                  { icon: Linkedin01Icon, label: 'LinkedIn' },
                  { icon: YoutubeIcon, label: 'YouTube' },
                ].map((s) => (
                  <span
                    key={s.label}
                    title={s.label}
                    className={cn(
                      'grid size-11 place-items-center rounded-full',
                      isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'
                    )}
                  >
                    <HugeiconsIcon icon={s.icon} size={18} color="currentColor" strokeWidth={1.8} />
                  </span>
                ))}
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
