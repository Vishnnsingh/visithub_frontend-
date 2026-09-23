import { ArrowRight01Icon, QrCode01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useIsLandingLight } from './landingTheme';

const STACK_MASK = 'linear-gradient(to right, black 0%, black 72%, transparent 100%)';

function StackedDashboards() {
  const isLight = useIsLandingLight();

  return (
    <div className="relative mx-auto mt-12 mb-10 h-[300px] w-full max-w-6xl sm:mt-14 sm:mb-12 sm:h-[400px] lg:h-[480px] xl:h-[540px]">
      <div
        className="pointer-events-none absolute top-[10%] left-[20%] h-[70%] w-[70%] rounded-full opacity-70"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse at center, rgba(17,24,39,0.06) 0%, transparent 68%)'
            : 'radial-gradient(ellipse at center, rgba(255,255,255,0.16) 0%, transparent 68%)',
        }}
        aria-hidden
      />

      <div
        className="absolute inset-0 origin-center"
        style={{
          perspective: '1600px',
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          className="absolute top-[8%] left-[-2%] w-[78%] max-w-4xl sm:left-[2%] lg:left-[6%]"
          style={{
            transform: 'rotateX(22deg) rotateZ(-8deg) rotateY(6deg) translateZ(-40px)',
            transformStyle: 'preserve-3d',
            maskImage: STACK_MASK,
            WebkitMaskImage: STACK_MASK,
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 0.85, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05 }}
        >
          <img
            src="/landing/admin/home-element.png"
            alt="Home Element admin screen"
            className="w-full rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
          />
        </motion.div>

        <motion.div
          className="absolute top-0 left-[12%] z-10 w-[82%] max-w-4xl sm:left-[18%] lg:left-[22%]"
          style={{
            transform: 'rotateX(22deg) rotateZ(-8deg) rotateY(6deg) translateZ(20px)',
            transformStyle: 'preserve-3d',
            maskImage: STACK_MASK,
            WebkitMaskImage: STACK_MASK,
          }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15 }}
        >
          <img
            src="/landing/admin/dashboard.png"
            alt="Organisation dashboard"
            className="w-full rounded-xl shadow-[0_40px_100px_rgba(0,0,0,0.7)] ring-1 ring-white/15"
          />
        </motion.div>
      </div>
    </div>
  );
}

function HeroScanner() {
  const isLight = useIsLandingLight();

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[220px] lg:mx-0 lg:justify-self-end"
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(17,24,39,0.12), transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)',
        }}
      />

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-4',
          isLight
            ? 'border-[#111827]/12 bg-white/80 shadow-[0_16px_40px_rgba(17,24,39,0.08)]'
            : 'border-white/12 bg-white/[0.04] shadow-[0_0_40px_rgba(255,255,255,0.12)]'
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p
            className={cn(
              'text-[10px] font-semibold tracking-[0.18em] uppercase',
              isLight ? 'text-[#111827]/72' : 'text-white/45'
            )}
          >
            Scan
          </p>
          <HugeiconsIcon
            icon={QrCode01Icon}
            size={14}
            color={isLight ? 'rgba(17,24,39,0.45)' : 'rgba(255,255,255,0.45)'}
            strokeWidth={1.8}
          />
        </div>

        <div
          className={cn(
            'relative mx-auto aspect-square w-[148px] overflow-hidden rounded-xl',
            isLight ? 'bg-[#111827]/4' : 'bg-white/5'
          )}
        >
          <span
            className={cn(
              'absolute top-2 left-2 h-5 w-5 rounded-tl-md border-t-2 border-l-2',
              isLight ? 'border-[#111827]' : 'border-white'
            )}
          />
          <span
            className={cn(
              'absolute top-2 right-2 h-5 w-5 rounded-tr-md border-t-2 border-r-2',
              isLight ? 'border-[#111827]' : 'border-white'
            )}
          />
          <span
            className={cn(
              'absolute bottom-2 left-2 h-5 w-5 rounded-bl-md border-b-2 border-l-2',
              isLight ? 'border-[#111827]' : 'border-white'
            )}
          />
          <span
            className={cn(
              'absolute right-2 bottom-2 h-5 w-5 rounded-br-md border-r-2 border-b-2',
              isLight ? 'border-[#111827]' : 'border-white'
            )}
          />

          <div className="absolute inset-6 grid grid-cols-5 gap-1.5 opacity-80">
            {Array.from({ length: 25 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'rounded-[2px]',
                  [0, 1, 2, 5, 10, 14, 15, 20, 21, 22, 4, 9, 24, 12, 7, 17].includes(i)
                    ? isLight
                      ? 'bg-[#111827]'
                      : 'bg-white'
                    : isLight
                      ? 'bg-[#111827]/15'
                      : 'bg-white/15'
                )}
              />
            ))}
          </div>

          <motion.div
            className={cn(
              'absolute inset-x-3 h-0.5 rounded-full',
              isLight
                ? 'bg-[#111827] shadow-[0_0_12px_rgba(17,24,39,0.45)]'
                : 'bg-white shadow-[0_0_16px_rgba(255,255,255,0.7)]'
            )}
            animate={{ top: ['12%', '88%', '12%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function LandingHero() {
  const isLight = useIsLandingLight();

  return (
    <section
      id="home"
      className={cn(
        'relative w-full scroll-mt-20 overflow-hidden',
        isLight ? 'bg-transparent text-[#111827]' : 'bg-transparent text-white'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          isLight
            ? 'bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(17,24,39,0.04),transparent_55%),radial-gradient(800px_480px_at_75%_55%,rgba(17,24,39,0.03),transparent_55%)]'
            : 'bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(800px_480px_at_75%_55%,rgba(255,255,255,0.07),transparent_55%)]'
        )}
      />

      <div className="relative z-10 w-full px-6 pt-14 sm:px-10 sm:pt-16 lg:px-16 xl:px-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(200px,0.55fr)] lg:gap-8 xl:gap-12">
          <motion.div
            className="max-w-5xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p
              className={cn(
                'text-xs font-semibold tracking-[0.22em] uppercase',
                isLight ? 'text-[#111827]/75' : 'text-white/45'
              )}
            >
              Visit Hub
            </p>
            <h1
              className={cn(
                'mt-4 font-[Outfit,sans-serif] text-[clamp(1.35rem,4.2vw,3.5rem)] font-bold leading-[1.15] tracking-tight',
                isLight ? 'text-[#111827]' : 'text-white'
              )}
            >
              <span className="block whitespace-nowrap">Paperless Visitor Check-In.</span>
              <span
                className="mt-1 block whitespace-nowrap"
                aria-label="No Paper, No App, Just Scan & Check In."
              >
                {(() => {
                  const words = 'No Paper, No App, Just Scan & Check In.'.split(' ');
                  const stagger = 0.32;
                  const hold = 1.8;
                  const fade = 0.45;
                  const cycle = words.length * stagger + hold + fade;
                  return words.map((word, index) => {
                    const appear = (index * stagger) / cycle;
                    const shown = (index * stagger + 0.22) / cycle;
                    const holdEnd = (words.length * stagger + hold) / cycle;
                    return (
                      <motion.span
                        key={`${word}-${index}`}
                        className="inline-block pr-[0.28em] last:pr-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, 0] }}
                        transition={{
                          duration: cycle,
                          times: [appear, shown, holdEnd, 1],
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      >
                        {word}
                      </motion.span>
                    );
                  });
                })()}
              </span>
            </h1>
            <p
              className={cn(
                'mt-5 max-w-xl text-base leading-7 sm:text-lg',
                isLight ? 'text-[#111827]/75' : 'text-white/50'
              )}
            >
              Make visitor check-in and check-out completely digital. No registers, no fancy hardware, no
              Play Store app required — just one QR code that lets visitors check in from their own phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/create-account"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold',
                  isLight
                    ? 'bg-[#111827] text-white hover:bg-[#0b1220]'
                    : 'bg-white text-[#050505] shadow-[0_0_48px_rgba(255,255,255,0.35)] hover:bg-white/90'
                )}
              >
                Get Started
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
              </Link>
              <button
                type="button"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border bg-transparent px-6 py-3.5 text-sm font-semibold',
                  isLight
                    ? 'border-[#111827]/20 text-[#111827] hover:bg-[#111827]/5'
                    : 'border-white/15 text-white hover:bg-white/10'
                )}
              >
                Browse features
              </button>
            </div>
          </motion.div>

          <HeroScanner />
        </div>
      </div>

      <StackedDashboards />
    </section>
  );
}
