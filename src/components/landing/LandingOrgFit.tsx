import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useIsLandingLight } from './landingTheme';

const ORG_LINES = [
  { bold: 'Schools & colleges', rest: ' — parent and guest entry with photo fields' },
  { bold: 'Offices & factories', rest: ' — gate QR, waiting tickets, out-time control' },
  { bold: 'Hotels, hospitals & societies', rest: ' — one modern visitor experience' },
  { bold: 'Events, temples, clinics & more', rest: ' — same QR flow, your branding' },
] as const;

function DarkVisitVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <motion.img
        src="/landing/2d-photo.png"
        alt="Visitor scanning QR at reception"
        className="relative z-10 w-full object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,0.55)]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/** Home section 3 — who Visit Hub is for (no About label). */
export function LandingOrgFit() {
  const isLight = useIsLandingLight();

  return (
    <section
      id="org-fit"
      className={cn(
        'relative w-full scroll-mt-20 overflow-hidden',
        isLight ? 'bg-transparent' : 'bg-transparent'
      )}
    >
      <div className="relative w-full px-6 pt-20 pb-16 sm:px-10 sm:pt-24 lg:px-16 lg:pt-28 lg:pb-24 xl:px-24">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            'mx-auto max-w-5xl text-center font-[Outfit,sans-serif] text-[1.35rem] font-bold tracking-tight sm:text-2xl md:text-3xl lg:whitespace-nowrap lg:text-[1.85rem] xl:text-[2.1rem]',
            isLight ? 'text-[#111827]' : 'text-white'
          )}
        >
          Built so every organisation looks professional from the first visit
        </motion.h2>

        <div className="mt-12 grid items-center gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
          >
            <p className={cn('text-base leading-7', isLight ? 'text-[#111827]/78' : 'text-white/55')}>
              <span className={cn('font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>Visit Hub</span>{' '}
              replaces paper registers with a branded digital flow. Guests scan{' '}
              <span className={cn('font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>one QR</span>, continue
              securely, and land on your customisable home — with social links and Google review. Your team runs{' '}
              <span className={cn('font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                tickets and meetings
              </span>{' '}
              from a clear dashboard. Each organisation stays{' '}
              <span className={cn('font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>completely separate</span>
              .
            </p>

            <p
              className={cn(
                'mt-6 text-sm font-bold sm:text-base',
                isLight ? 'text-[#111827]' : 'text-white'
              )}
            >
              Any organisation can use Visit Hub — not only the examples below.
            </p>

            <ul className="mt-5 space-y-3.5">
              {ORG_LINES.map((item) => (
                <li
                  key={item.bold}
                  className={cn(
                    'flex items-start gap-3 text-sm leading-6 sm:text-[15px]',
                    isLight ? 'text-[#111827]/78' : 'text-white/55'
                  )}
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#111827] text-white">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} color="currentColor" strokeWidth={2.2} />
                  </span>
                  <span>
                    <span className={cn('font-bold', isLight ? 'text-[#111827]' : 'text-white')}>{item.bold}</span>
                    {item.rest}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: 0.06 }}
          >
            <DarkVisitVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
