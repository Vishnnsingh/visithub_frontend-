import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { HomeElements } from '../visit/HomeElements';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { isVisitThemeId, visitThemeClass, type VisitThemeId } from '../../lib/visitTheme';
import type { PublicHomeLayout } from '../../lib/homeLayout';

/** DPS SCHOOL — live visitor home after QR scan (demo org on this install). */
export const LANDING_DEMO_ORG_ID = '20c7a808-5dff-4f33-b95c-4a5f8889bf2f';

type PublicOrgHomePayload = {
  organizationId: string;
  organizationName: string;
  organizationLogo?: string | null;
  homeLayout?: PublicHomeLayout | null;
  meetingBoard?: {
    date: string;
    items: Array<{
      name: string;
      status: 'yes' | 'no' | null;
      label: string;
      nextAvailableDate?: string | null;
      nextAvailableInDays?: number | null;
    }>;
  } | null;
  googleReview?: {
    enabled: boolean;
    url: string;
    label?: string;
    hint?: string;
  } | null;
};

const VISITOR_SLIDES = [
  { id: 'home', label: 'Visitor Home' },
  { id: 'board', label: 'Availability' },
] as const;

type LandingVisitorPreviewProps = {
  className?: string;
};

export function LandingVisitorPreview({ className }: LandingVisitorPreviewProps) {
  const [slide, setSlide] = useState(0);

  const homeQuery = useQuery({
    queryKey: ['landing-demo-visitor-home', LANDING_DEMO_ORG_ID],
    queryFn: async () => {
      const response = await api.get(`/public/org/${LANDING_DEMO_ORG_ID}/home`);
      return response.data.data as PublicOrgHomePayload;
    },
  });

  const data = homeQuery.data;
  const theme: VisitThemeId = isVisitThemeId(data?.homeLayout?.bgTheme) ? data!.homeLayout!.bgTheme! : 'default';

  const go = (dir: -1 | 1) => {
    setSlide((current) => (current + dir + VISITOR_SLIDES.length) % VISITOR_SLIDES.length);
  };

  return (
    <div className={cn('relative mx-auto w-full max-w-[340px]', className)}>
      <div className="overflow-hidden rounded-[2rem] bg-[#111827] p-2.5 shadow-[0_28px_70px_rgba(17,24,39,0.22)]">
        <div className="mb-2 flex items-center justify-center gap-1.5 pt-1">
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>
        <div className={cn(visitThemeClass(theme), 'h-[540px] overflow-y-auto rounded-[1.45rem] px-2.5 py-3')}>
          {homeQuery.isLoading ? (
            <p className="py-16 text-center text-sm text-mute">Opening visitor home...</p>
          ) : homeQuery.error || !data ? (
            <p className="py-16 text-center text-sm text-danger">Could not load visitor home.</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={VISITOR_SLIDES[slide].id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28 }}
              >
                {slide === 0 ? (
                  <HomeElements
                    layout={data.homeLayout}
                    organizationName={data.organizationName}
                    meetingBoard={null}
                    googleReview={data.googleReview}
                  />
                ) : (
                  <HomeElements
                    layout={{
                      ...(data.homeLayout || { cards: [], bgTheme: 'default' as const }),
                      meetingBoardEnabled: true,
                      homeSlotOrder: ['meetingBoard'],
                    }}
                    organizationName={data.organizationName}
                    meetingBoard={data.meetingBoard}
                    googleReview={null}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          className="grid size-10 place-items-center rounded-full bg-primary text-white shadow-md hover:bg-primary-deep"
          aria-label="Previous visitor screen"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color="currentColor" strokeWidth={2} />
        </button>
        <div className="min-w-28 text-center">
          <p className="text-sm font-semibold text-ink">{VISITOR_SLIDES[slide].label}</p>
          <p className="text-xs text-mute">
            {slide + 1} / {VISITOR_SLIDES.length} · After QR scan
          </p>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="grid size-10 place-items-center rounded-full bg-primary text-white shadow-md hover:bg-primary-deep"
          aria-label="Next visitor screen"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="currentColor" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
