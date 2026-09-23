import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '../../lib/cn';

const ADMIN_SLIDES = [
  {
    file: 'dashboard.png',
    title: 'Dashboard',
    text: 'Today’s visitors graph, meetings calendar, and Yes / Not availability.',
  },
  {
    file: 'staff.png',
    title: 'Add Staff',
    text: 'Invite staff and control which pages each role can open.',
  },
  {
    file: 'organisation.png',
    title: 'Organisation',
    text: 'School / office profile, logo, working days and Google review link.',
  },
  {
    file: 'qr-codes.png',
    title: 'QR Codes',
    text: 'Gate QR cards visitors scan to start check-in.',
  },
  {
    file: 'visitor-details.png',
    title: 'Visitor details',
    text: 'Search and review every visitor record for your organisation.',
  },
  {
    file: 'tickets.png',
    title: 'Tickets',
    text: 'Waiting, confirmed and closed tickets for the front desk.',
  },
  {
    file: 'notifications.png',
    title: 'Notifications',
    text: 'Live alerts so reception never misses a new visit.',
  },
  {
    file: 'home-element.png',
    title: 'Home Element',
    text: 'Design the public visitor home — cards, images, social and review.',
  },
  {
    file: 'active-fields.png',
    title: 'Active Fields',
    text: 'Turn fields on/off, rename labels, require photos and uploads.',
  },
] as const;

export function LandingAdminCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const slide = ADMIN_SLIDES[index];

  const go = (dir: -1 | 1) => {
    setIndex((current) => (current + dir + ADMIN_SLIDES.length) % ADMIN_SLIDES.length);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="relative overflow-hidden rounded-[1.6rem] bg-[#111111] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.file}
            src={`/landing/admin/${slide.file}`}
            alt={`Admin ${slide.title}`}
            className="block h-auto max-h-[520px] w-full bg-[#111111] object-cover object-top"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).src = '/landing/dashboard.png';
            }}
          />
        </AnimatePresence>

        <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="grid size-11 place-items-center rounded-full bg-white/90 text-[#050505] shadow-lg backdrop-blur hover:bg-white"
            aria-label="Previous admin screen"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color="currentColor" strokeWidth={2} />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
          <button
            type="button"
            onClick={() => go(1)}
            className="grid size-11 place-items-center rounded-full bg-white/90 text-[#050505] shadow-lg backdrop-blur hover:bg-white"
            aria-label="Next admin screen"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="currentColor" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-white/40 uppercase">Admin screens</p>
          <h3 className="mt-1 text-xl font-bold text-white">{slide.title}</h3>
          <p className="mt-1 max-w-xl text-sm text-white/55">{slide.text}</p>
        </div>
        <div className="flex items-center gap-2">
          {ADMIN_SLIDES.map((item, i) => (
            <button
              key={item.file}
              type="button"
              aria-label={item.title}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2.5 rounded-full transition-all',
                i === index ? 'w-7 bg-white' : 'w-2.5 bg-white/25 hover:bg-white/40'
              )}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-white/40">
        {index + 1} / {ADMIN_SLIDES.length} — swipe next to see every admin dashboard page
      </p>
    </div>
  );
}
