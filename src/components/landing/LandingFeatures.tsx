import {
  Camera01Icon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Home01Icon,
  IdentificationIcon,
  Mail01Icon,
  Notification01Icon,
  QrCode01Icon,
  SecurityCheckIcon,
  SmartPhone01Icon,
  StarIcon,
  Ticket01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion, useInView } from 'framer-motion';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useIsLandingLight } from './landingTheme';

const ROLE_AVATARS = [
  {
    label: 'Admin',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  },
  {
    label: 'Reception',
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    label: 'Security',
    src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  },
  {
    label: 'Front desk',
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  },
  {
    label: 'Manager',
    src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  },
  {
    label: 'Staff',
    src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  },
] as const;

/** Compact staggered rows — faces only + center logo (no empty dashed boxes) */
const ROLE_ROWS: Array<Array<'logo' | number>> = [
  [0, 1],
  [2, 'logo', 3],
  [4, 5],
];

const FACE_SLOT = 1.25;
const FACE_LOOP = ROLE_AVATARS.length * FACE_SLOT;

function RoleFace({
  faceIndex,
  inView,
}: {
  faceIndex: number;
  inView: boolean;
}) {
  const avatar = ROLE_AVATARS[faceIndex];
  const start = faceIndex / ROLE_AVATARS.length;
  const mid = start + 0.5 / ROLE_AVATARS.length;
  const end = (faceIndex + 1) / ROLE_AVATARS.length;

  return (
    <motion.div
      className="aspect-square w-14 overflow-hidden rounded-2xl sm:w-16 lg:w-18"
      style={{
        boxShadow: '0 0 0 1.5px rgba(56,189,248,0.55), 0 0 22px rgba(56,189,248,0.35)',
      }}
      title={avatar.label}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={
        inView
          ? {
              opacity: [1, 1, 0, 1, 1],
              scale: [1, 1, 0.85, 1, 1],
            }
          : { opacity: 0, scale: 0.5 }
      }
      transition={{
        duration: FACE_LOOP,
        delay: 0.3,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, start, mid, end, 1],
      }}
    >
      <img
        src={avatar.src}
        alt={avatar.label}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </motion.div>
  );
}

function RoleBasedGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const isLight = useIsLandingLight();

  return (
    <div ref={ref} className="mt-8 flex flex-col items-center gap-2.5 sm:mt-10 sm:gap-3">
      {ROLE_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-center gap-2.5 sm:gap-3">
          {row.map((tile, colIndex) =>
            tile === 'logo' ? (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  'grid aspect-square w-14 place-items-center rounded-2xl sm:w-16 lg:w-18',
                  isLight ? 'border border-black/10 bg-white' : 'bg-[#141414]'
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-lg text-[10px] font-bold sm:size-10 sm:text-xs',
                    isLight ? 'bg-[#111827] text-white' : 'bg-white text-black'
                  )}
                >
                  VH
                </span>
              </div>
            ) : (
              <RoleFace key={`${rowIndex}-${colIndex}`} faceIndex={tile} inView={inView} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function WaitCountdownDemo() {
  const isLight = useIsLandingLight();
  const [secs, setSecs] = useState(12 * 60 + 34);
  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 12 * 60 + 34)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <span
      className={cn(
        'font-mono text-2xl font-semibold tracking-wider tabular-nums sm:text-3xl',
        isLight ? 'text-[#111827]' : 'text-white'
      )}
    >
      {mm}:{ss}
    </span>
  );
}

function VisitorJourney() {
  const isLight = useIsLandingLight();

  return (
    <section
      id="visitor"
      className={cn(
        'relative mt-10 scroll-mt-20 overflow-hidden border-t sm:mt-14 lg:mt-16',
        isLight ? 'border-black/10 bg-transparent' : 'border-white/10 bg-transparent'
      )}
    >
      {/* Soft separation from admin features above */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent',
          isLight ? 'from-[#f4f4f5]' : 'from-[#050505]'
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(90vw,42rem)] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative w-full px-6 pt-24 pb-16 sm:px-10 sm:pt-28 lg:px-16 lg:pt-32 lg:pb-24 xl:px-24">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-sky-300 ring-1 ring-sky-400/25"
          >
            <HugeiconsIcon icon={SmartPhone01Icon} size={13} color="currentColor" strokeWidth={1.8} />
            For visitors · after QR scan
          </motion.span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              'font-[Outfit,sans-serif] text-3xl font-bold tracking-tight sm:text-4xl xl:text-[2.5rem] xl:leading-[1.12]',
              isLight ? 'text-[#111827]' : 'text-white'
            )}
          >
            Visitor QR journey
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className={cn('max-w-lg text-base leading-7', isLight ? 'text-[#111827]/72' : 'text-white/45')}
          >
            Separate from the admin dashboard — this is what guests see: scan, continue, details, selfie, ticket
            & wait, then checkout.
          </motion.p>
        </div>

        {/* Step strip */}
        <div className="mt-10 flex flex-wrap gap-2 sm:gap-3">
          {['1 · Scan', '2 · Details', '3 · Photo', '4 · Ticket', '5 · Checkout'].map((label, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium ring-1',
                isLight
                  ? 'border border-black/10 bg-white text-[#111827]/85 ring-black/10'
                  : 'bg-[#121212] text-white/70 ring-white/10'
              )}
            >
              {label}
            </motion.span>
          ))}
        </div>

        <div className="mt-10 grid lg:grid-cols-2">
          {/* Step 1 — Scan & continue */}
          <Cell
            title="Step 1 · Scan QR"
            text="Visitor scans the gate QR, then Continue with Google or Continue with number."
            className={cn('border-b lg:border-r', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <div
              className={cn(
                'mx-auto max-w-xs space-y-3 rounded-xl p-4',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              <div
                className={cn(
                  'mx-auto grid size-20 place-items-center rounded-2xl ring-1',
                  isLight ? 'bg-[#f4f4f5] ring-black/10' : 'bg-white/5 ring-white/10'
                )}
              >
                <HugeiconsIcon
                  icon={QrCode01Icon}
                  size={40}
                  color="currentColor"
                  strokeWidth={1.5}
                  className={isLight ? 'text-[#111827]' : 'text-white'}
                />
              </div>
              <p className={cn('text-center text-[11px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>
                Gate A · Your Organisation
              </p>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold',
                  isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#050505]'
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-[#4285F4] text-[8px] font-bold text-white">
                  G
                </span>
                Continue with Google
              </button>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border bg-transparent px-3 py-2.5 text-xs font-semibold',
                  isLight
                    ? 'border-[#111827]/20 text-[#111827]'
                    : 'border-white/15 text-white'
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} size={14} color="currentColor" strokeWidth={1.8} />
                Continue with number
              </button>
            </div>
          </Cell>

          {/* Step 2 — Enter details */}
          <Cell
            title="Step 2 · Enter details"
            text="Name & email prefilled. Address, meeting purpose and admin Active Fields — date & in-time auto, no typing."
            className={cn('border-b', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <div
              className={cn(
                'mx-auto max-w-sm space-y-2 rounded-xl p-4',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              {[
                { icon: Mail01Icon, label: 'Name', value: 'Aarav Sharma', locked: true },
                { icon: Mail01Icon, label: 'Email', value: 'aarav@gmail.com', locked: true },
                { icon: Home01Icon, label: 'Address', value: 'Enter address', locked: false },
                { icon: Ticket01Icon, label: 'Meeting purpose', value: 'Parent meeting', locked: false },
              ].map((f) => (
                <div
                  key={f.label}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 ring-1',
                    isLight ? 'bg-[#f4f4f5] ring-black/10' : 'bg-[#121212] ring-white/5'
                  )}
                >
                  <HugeiconsIcon
                    icon={f.icon}
                    size={13}
                    color="currentColor"
                    strokeWidth={1.8}
                    className={cn('shrink-0', isLight ? 'text-[#111827]/70' : 'text-white/40')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[10px]', isLight ? 'text-[#111827]/65' : 'text-white/35')}>{f.label}</p>
                    <p
                      className={cn(
                        'truncate text-xs',
                        f.locked
                          ? isLight
                            ? 'text-[#111827]/92'
                            : 'text-white/80'
                          : isLight
                            ? 'text-[#111827]/70'
                            : 'text-white/40'
                      )}
                    >
                      {f.value}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <div
                  className={cn(
                    'flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-2 ring-1 ring-emerald-500/20',
                    isLight ? 'bg-[#f4f4f5]' : 'bg-[#121212]'
                  )}
                >
                  <HugeiconsIcon icon={Clock01Icon} size={12} color="currentColor" strokeWidth={1.8} className="text-emerald-400" />
                  <div>
                    <p className="text-[9px] text-emerald-400/80">Auto date</p>
                    <p className={cn('text-[11px]', isLight ? 'text-[#111827]/85' : 'text-white/70')}>22 Sept 2026</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-2 ring-1 ring-emerald-500/20',
                    isLight ? 'bg-[#f4f4f5]' : 'bg-[#121212]'
                  )}
                >
                  <HugeiconsIcon icon={Clock01Icon} size={12} color="currentColor" strokeWidth={1.8} className="text-emerald-400" />
                  <div>
                    <p className="text-[9px] text-emerald-400/80">Auto in-time</p>
                    <p className={cn('text-[11px]', isLight ? 'text-[#111827]/85' : 'text-white/70')}>02:43 pm</p>
                  </div>
                </div>
              </div>
              <p className={cn('text-[10px]', isLight ? 'text-[#111827]/55' : 'text-white/30')}>
                + fields admin enabled in Active Fields
              </p>
              <div
                className={cn(
                  'rounded-lg py-2 text-center text-xs font-semibold',
                  isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#050505]'
                )}
              >
                Submit
              </div>
            </div>
          </Cell>

          {/* Step 3 — Photo */}
          <Cell
            title="Step 3 · Take photo"
            text="Next screen captures a verification selfie — camera or retake before the ticket opens."
            className={cn('border-b lg:border-r', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <div
              className={cn(
                'mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl p-5',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              <motion.div
                className={cn(
                  'relative grid size-28 place-items-center overflow-hidden rounded-2xl ring-2 ring-sky-400/50',
                  isLight ? 'bg-[#f4f4f5]' : 'bg-[#1a1a1a]'
                )}
                animate={{ boxShadow: ['0 0 0 rgba(56,189,248,0)', '0 0 24px rgba(56,189,248,0.35)', '0 0 0 rgba(56,189,248,0)'] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <HugeiconsIcon
                  icon={Camera01Icon}
                  size={36}
                  color="currentColor"
                  strokeWidth={1.5}
                  className={isLight ? 'text-[#111827]/85' : 'text-white/70'}
                />
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-0 py-1 text-center text-[10px]',
                    isLight ? 'bg-[#111827]/50 text-white' : 'bg-black/50 text-white/70'
                  )}
                >
                  Face the camera
                </span>
              </motion.div>
              <div className="flex w-full gap-2">
                <span
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-center text-xs',
                    isLight
                      ? 'border-[#111827]/20 text-[#111827]/80'
                      : 'border-white/15 text-white/60'
                  )}
                >
                  Retake
                </span>
                <span
                  className={cn(
                    'flex-1 rounded-lg py-2 text-center text-xs font-semibold',
                    isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#050505]'
                  )}
                >
                  Submit photo
                </span>
              </div>
            </div>
          </Cell>

          {/* Step 4 — Visitor app */}
          <Cell
            title="Step 4 · Visitor app"
            text="After check-in: token ID, wait countdown, Details, History, and More (theme + home)."
            className={cn('border-b', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <div
              className={cn(
                'mx-auto max-w-sm overflow-hidden rounded-xl',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn('text-[10px] tracking-wide uppercase', isLight ? 'text-[#111827]/65' : 'text-white/35')}>
                      Token ID
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 font-mono text-sm font-semibold',
                        isLight ? 'text-[#111827]' : 'text-white'
                      )}
                    >
                      VH-8F2K91
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    Waiting
                  </span>
                </div>
                <div
                  className={cn(
                    'rounded-xl px-4 py-4 text-center ring-1',
                    isLight ? 'bg-[#f4f4f5] ring-black/10' : 'bg-[#121212] ring-white/5'
                  )}
                >
                  <p className={cn('mb-1 text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>Wait timer</p>
                  <WaitCountdownDemo />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div
                    className={cn(
                      'rounded-lg px-2.5 py-2',
                      isLight ? 'bg-[#f4f4f5] text-[#111827]/78' : 'bg-[#121212] text-white/55'
                    )}
                  >
                    Details · fields & selfie
                  </div>
                  <div
                    className={cn(
                      'rounded-lg px-2.5 py-2',
                      isLight ? 'bg-[#f4f4f5] text-[#111827]/78' : 'bg-[#121212] text-white/55'
                    )}
                  >
                    History · past visits
                  </div>
                </div>
              </div>
              <div className={cn('flex border-t', isLight ? 'border-black/10' : 'border-white/10')}>
                {[
                  { icon: Home01Icon, label: 'Home' },
                  { icon: Ticket01Icon, label: 'Visitors', active: true },
                  { icon: CheckmarkCircle02Icon, label: 'Details' },
                  { icon: Clock01Icon, label: 'History' },
                  { icon: StarIcon, label: 'More' },
                ].map((tab) => (
                  <div
                    key={tab.label}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-0.5 py-2.5',
                      tab.active
                        ? isLight
                          ? 'text-[#111827]'
                          : 'text-white'
                        : isLight
                          ? 'text-[#111827]/65'
                          : 'text-white/35'
                    )}
                  >
                    <HugeiconsIcon icon={tab.icon} size={14} color="currentColor" strokeWidth={1.8} />
                    <span className="text-[9px]">{tab.label}</span>
                  </div>
                ))}
              </div>
              <p
                className={cn(
                  'border-t px-4 py-2 text-center text-[10px]',
                  isLight ? 'border-black/5 text-[#111827]/55' : 'border-white/5 text-white/30'
                )}
              >
                More · theme change · org home
              </p>
            </div>
          </Cell>
        </div>

        {/* Step 5 — Checkout full width */}
        <div className={cn('border-t', isLight ? 'border-black/10' : 'border-white/10')}>
          <Cell
            title="Step 5 · Meeting complete · Checkout"
            text="Fill get-number when done. If admin enabled take-picture, gate photo is required — then submit checkout."
            className=""
          >
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
              <div
                className={cn(
                  'rounded-xl p-4 ring-1',
                  isLight ? 'border border-black/10 bg-white ring-black/10' : 'bg-[#0c0c0c] ring-white/5'
                )}
              >
                <p className={cn('text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>Get number</p>
                <p className={cn('mt-2 font-mono text-lg font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                  +91 ····· 4821
                </p>
                <p className={cn('mt-1 text-[11px]', isLight ? 'text-[#111827]/65' : 'text-white/35')}>
                  Visitor fills on checkout
                </p>
              </div>
              <div
                className={cn(
                  'rounded-xl p-4 ring-1',
                  isLight ? 'border border-black/10 bg-white ring-black/10' : 'bg-[#0c0c0c] ring-white/5'
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <HugeiconsIcon icon={Camera01Icon} size={14} color="currentColor" strokeWidth={1.8} className="text-sky-400" />
                  <p className={cn('text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>Gate photo</p>
                </div>
                <p className={cn('text-xs', isLight ? 'text-[#111827]/85' : 'text-white/70')}>
                  Required only if admin turned Take picture on
                </p>
                <div
                  className={cn(
                    'mt-3 grid h-14 place-items-center rounded-lg border border-dashed',
                    isLight
                      ? 'border-black/15 bg-[#f4f4f5]'
                      : 'border-white/15 bg-[#121212]'
                  )}
                >
                  <span className={cn('text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>
                    Capture out photo
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'flex flex-col justify-between rounded-xl p-4 ring-1',
                  isLight ? 'border border-black/10 bg-white ring-black/10' : 'bg-[#0c0c0c] ring-white/5'
                )}
              >
                <div>
                  <p className={cn('text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>Finish</p>
                  <p className={cn('mt-1 text-xs', isLight ? 'text-[#111827]/85' : 'text-white/70')}>
                    Remarks · signature · out-gate · submit
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-emerald-500/90 py-2.5 text-center text-xs font-semibold text-[#050505]">
                  Submit & checkout
                </div>
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}

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

export function LandingFeatures() {
  const isLight = useIsLandingLight();

  return (
    <>
    <section
      id="features"
      className={cn(
        'relative w-full scroll-mt-20 overflow-hidden pb-8 sm:pb-12',
        isLight ? 'bg-transparent' : 'bg-transparent'
      )}
    >
      <div className="relative w-full px-6 py-16 sm:px-10 lg:px-16 lg:py-24 xl:px-24">
        <div className="mb-6">
          <span
            className={cn(
              'inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide ring-1',
              isLight
                ? 'bg-[#111827]/5 text-[#111827]/75 ring-black/10'
                : 'bg-white/5 text-white/50 ring-white/10'
            )}
          >
            For organisations · admin & staff
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              'font-[Outfit,sans-serif] text-3xl font-bold tracking-tight sm:text-4xl xl:text-[2.75rem] xl:leading-[1.12]',
              isLight ? 'text-[#111827]' : 'text-white'
            )}
          >
            Built for organisations that need control.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className={cn('max-w-lg text-base leading-7', isLight ? 'text-[#111827]/72' : 'text-white/45')}
          >
            QR check-in, branded home, Google review, photos, tickets and staff roles — every visit stays inside
            your organisation, without Play Store downloads.
          </motion.p>
        </div>

        {/* Divider grid — no card borders (Aceternity-style) */}
        <div className="mt-14 grid lg:grid-cols-2">
          {/* Top-left — live activity (more content → taller feel) */}
          <Cell
            title="Live visit trail"
            text="Tracks every check-in with host, gate, wait timer and ticket status — timestamps for your front desk."
            className={cn('border-b lg:border-r', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <div
              className={cn(
                'space-y-2 rounded-xl p-3 sm:p-4',
                isLight ? 'border border-black/10 bg-white' : 'bg-[#0c0c0c]'
              )}
            >
              <p
                className={cn(
                  'mb-3 flex items-center gap-2 text-xs font-medium',
                  isLight ? 'text-[#111827]/75' : 'text-white/50'
                )}
              >
                <HugeiconsIcon icon={Notification01Icon} size={14} color="currentColor" strokeWidth={1.8} />
                Recent activity
              </p>
              {[
                { name: 'Visitor check-in', tip: 'Gate A · selfie done', badge: 'LIVE', tone: 'bg-emerald-500/20 text-emerald-300' },
                { name: 'Host Not available', tip: 'Next date tomorrow', badge: 'ALERT', tone: 'bg-rose-500/20 text-rose-300' },
                { name: 'Wait timer', tip: 'Staff updated minutes', badge: '12s', tone: 'bg-amber-500/20 text-amber-200' },
                {
                  name: 'Checkout complete',
                  tip: 'Out-time + rating',
                  badge: '2m',
                  tone: isLight ? 'bg-[#111827]/10 text-[#111827]/75' : 'bg-white/10 text-white/50',
                },
                {
                  name: 'Google review tap',
                  tip: 'From public home',
                  badge: '5m',
                  tone: isLight ? 'bg-[#111827]/10 text-[#111827]/75' : 'bg-white/10 text-white/50',
                },
              ].map((row, index) => (
                <motion.div
                  key={row.name}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 + index * 0.07 }}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 sm:px-2.5"
                >
                  <div className="min-w-0">
                    <p className={cn('truncate text-sm', isLight ? 'text-[#111827]/85' : 'text-white/85')}>
                      {row.name}
                    </p>
                    <p className={cn('truncate text-[11px]', isLight ? 'text-[#111827]/65' : 'text-white/35')}>
                      {row.tip}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.tone}`}>
                    {row.badge}
                  </span>
                </motion.div>
              ))}
            </div>
          </Cell>

          {/* Top-right — role based */}
          <Cell
            title="Role-Based Access"
            text="Controls who can open Dashboard, Tickets, QR Codes, Home Element and Active Fields."
            className={cn('border-b', isLight ? 'border-black/10' : 'border-white/10')}
          >
            <RoleBasedGrid />
          </Cell>

          {/* Bottom-left — checkout / approval style */}
          <Cell
            title="Meeting checkout"
            text="Visitor submits out-time, remarks, signature and gate photo — then optional star rating."
            className={cn(
              'border-b lg:border-r lg:border-b-0',
              isLight ? 'border-black/10' : 'border-white/10'
            )}
          >
            <div className="relative mx-auto flex h-40 max-w-xs items-center justify-center">
              <div className={cn('absolute inset-x-8 top-1/2 h-px', isLight ? 'bg-black/10' : 'bg-white/10')} />
              <div className="relative z-10 flex w-full items-center justify-between gap-3">
                <span className="rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                  Waiting
                </span>
                <HugeiconsIcon
                  icon={Ticket01Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={1.8}
                  className={isLight ? 'text-[#111827]/70' : 'text-white/40'}
                />
                <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  Checked out
                </span>
              </div>
            </div>
          </Cell>

          {/* Bottom-right — smaller content cell */}
          <Cell
            title="Home & reviews"
            text="Custom home, Google review and social links from one QR experience."
            className="lg:border-b-0"
          >
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Home01Icon, label: 'Custom home' },
                { icon: StarIcon, label: 'Google review' },
                { icon: QrCode01Icon, label: 'Single QR' },
                { icon: Camera01Icon, label: 'Photos' },
                { icon: SmartPhone01Icon, label: 'PWA shortcut' },
                { icon: SecurityCheckIcon, label: 'Org isolated' },
              ].map((chip, index) => (
                <motion.span
                  key={chip.label}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 + index * 0.05 }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs',
                    isLight
                      ? 'border border-black/10 bg-white text-[#111827]/82'
                      : 'bg-[#121212] text-white/65'
                  )}
                >
                  <HugeiconsIcon icon={chip.icon} size={13} color="currentColor" strokeWidth={1.8} />
                  {chip.label}
                </motion.span>
              ))}
            </div>
          </Cell>
        </div>

        {/* Admin feature modules — named like dashboard sidebar */}
        <div className={cn('mt-0 border-t', isLight ? 'border-black/10' : 'border-white/10')}>
          <div className="px-6 pt-10 pb-2 sm:px-8 lg:px-10">
            <p
              className={cn(
                'text-xs font-semibold tracking-[0.18em] uppercase',
                isLight ? 'text-[#111827]/78' : 'text-white/35'
              )}
            >
              Admin dashboard
            </p>
            <h3
              className={cn(
                'mt-2 font-[Outfit,sans-serif] text-xl font-bold sm:text-2xl',
                isLight ? 'text-[#111827]' : 'text-white'
              )}
            >
              Everything your team opens after login
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Ticket01Icon,
                title: 'Tickets',
                text: 'Live wait queue, host Yes / Not / Update shortly, and meeting status for every visitor.',
                preview: (
                  <div className="mt-4 space-y-1.5">
                    {['VH-8F2K · Waiting', 'VH-91AB · Confirmed'].map((row, i) => (
                      <div
                        key={row}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px]',
                          isLight ? 'bg-[#f4f4f5] text-[#111827]/85' : 'bg-[#121212] text-white/70'
                        )}
                      >
                        <span className="font-mono">{row}</span>
                        <span className={i === 0 ? 'text-amber-300' : 'text-emerald-300'}>{i === 0 ? '12:40' : 'Done'}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: IdentificationIcon,
                title: 'Visitor details',
                text: 'Full visit record — selfie, fields, in/out gate, duration and checkout photos in one place.',
                preview: (
                  <div
                    className={cn(
                      'mt-4 flex items-center gap-3 rounded-lg px-3 py-3',
                      isLight ? 'bg-[#f4f4f5]' : 'bg-[#121212]'
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-xl text-xs font-bold',
                        isLight ? 'bg-[#111827]/10 text-[#111827]' : 'bg-white/10 text-white'
                      )}
                    >
                      AS
                    </span>
                    <div className="min-w-0">
                      <p className={cn('truncate text-xs font-medium', isLight ? 'text-[#111827]' : 'text-white')}>
                        Aarav Sharma
                      </p>
                      <p className={cn('text-[10px]', isLight ? 'text-[#111827]/70' : 'text-white/40')}>
                        Gate A · in 02:43 pm · selfie ✓
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                icon: QrCode01Icon,
                title: 'Dynamic QR codes',
                text: 'Generate gate QR codes on demand — each scan opens that gate’s visitor flow for your org.',
                preview: (
                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className={cn(
                        'grid size-14 place-items-center rounded-xl',
                        isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#050505]'
                      )}
                    >
                      <HugeiconsIcon icon={QrCode01Icon} size={28} color="currentColor" strokeWidth={1.5} />
                    </div>
                    <div className={cn('text-[11px] leading-5', isLight ? 'text-[#111827]/72' : 'text-white/45')}>
                      <p className={cn('font-medium', isLight ? 'text-[#111827]/75' : 'text-white/75')}>
                        Gate A · Main entry
                      </p>
                      <p>Download · print · refresh</p>
                    </div>
                  </div>
                ),
              },
              {
                icon: Notification01Icon,
                title: 'Notifications',
                text: 'Alerts for new check-ins, host updates and wait-timer changes — front desk stays in sync.',
                preview: (
                  <div className="mt-4 space-y-1.5">
                    {[
                      { t: 'New visitor at Gate A', d: 'Just now' },
                      { t: 'Wait timer updated', d: '2m ago' },
                    ].map((n) => (
                      <div
                        key={n.t}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2',
                          isLight ? 'bg-[#f4f4f5]' : 'bg-[#121212]'
                        )}
                      >
                        <p className={cn('truncate text-[11px]', isLight ? 'text-[#111827]/85' : 'text-white/70')}>
                          {n.t}
                        </p>
                        <span className={cn('shrink-0 text-[10px]', isLight ? 'text-[#111827]/65' : 'text-white/35')}>
                          {n.d}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: Home01Icon,
                title: 'Home Element',
                text: 'Customise what visitors see on Home — cards, notice board, Google review and social links.',
                preview: (
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {['Notice', 'Review', 'Social'].map((label) => (
                      <div
                        key={label}
                        className={cn(
                          'rounded-lg px-1.5 py-2.5 text-center text-[10px] font-medium',
                          isLight ? 'bg-[#f4f4f5] text-[#111827]/78' : 'bg-[#121212] text-white/55'
                        )}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: CheckListIcon,
                title: 'Active Fields',
                text: 'Turn check-in fields on/off, set required rules, and control what appears on the visitor form.',
                preview: (
                  <div className="mt-4 space-y-1.5">
                    {[
                      { f: 'Address', on: true },
                      { f: 'Meeting purpose', on: true },
                      { f: 'Aadhaar photo', on: false },
                    ].map((row) => (
                      <div
                        key={row.f}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px]',
                          isLight ? 'bg-[#f4f4f5]' : 'bg-[#121212]'
                        )}
                      >
                        <span className={isLight ? 'text-[#111827]/85' : 'text-white/70'}>{row.f}</span>
                        <span
                          className={
                            row.on ? 'text-emerald-400' : isLight ? 'text-[#111827]/55' : 'text-white/30'
                          }
                        >
                          {row.on ? 'On' : 'Off'}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-6 sm:p-8',
                  index % 2 === 0 ? (isLight ? 'sm:border-r sm:border-black/10' : 'sm:border-r sm:border-white/10') : '',
                  index < 4
                    ? isLight
                      ? 'border-b border-black/10'
                      : 'border-b border-white/10'
                    : index < 5
                      ? isLight
                        ? 'border-b border-black/10 lg:border-b-0'
                        : 'border-b border-white/10 lg:border-b-0'
                      : '',
                  index === 4
                    ? isLight
                      ? 'lg:border-r lg:border-black/10'
                      : 'lg:border-r lg:border-white/10'
                    : ''
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-lg ring-1',
                      isLight
                        ? 'bg-[#111827]/5 text-[#111827] ring-black/10'
                        : 'bg-white/5 text-white ring-white/10'
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} color="currentColor" strokeWidth={1.8} />
                  </span>
                  <h3 className={cn('text-base font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                    {item.title}
                  </h3>
                </div>
                <p className={cn('mt-2 text-sm leading-6', isLight ? 'text-[#111827]/85' : 'text-white/40')}>
                  {item.text}
                </p>
                {item.preview}
              </motion.div>
            ))}
          </div>
        </div>

        <div className={cn('grid border-t sm:grid-cols-2', isLight ? 'border-black/10' : 'border-white/10')}>
          {[
            {
              icon: UserMultipleIcon,
              title: 'Staff pages',
              text: 'Reception only sees the pages you allow via roles.',
            },
            {
              icon: SmartPhone01Icon,
              title: 'No Play Store',
              text: 'Home-screen shortcut opens your public visitor home.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className={cn(
                'px-6 py-8 sm:px-8',
                index === 0
                  ? isLight
                    ? 'border-b border-black/10 sm:border-r sm:border-b-0'
                    : 'border-b border-white/10 sm:border-r sm:border-b-0'
                  : ''
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={18}
                color="currentColor"
                strokeWidth={1.8}
                className={isLight ? 'text-[#111827]/85' : 'text-white/70'}
              />
              <h3 className={cn('mt-3 text-base font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                {item.title}
              </h3>
              <p className={cn('mt-1.5 text-sm leading-6', isLight ? 'text-[#111827]/85' : 'text-white/40')}>
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <VisitorJourney />
    </>
  );
}
