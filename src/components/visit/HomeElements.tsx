import type { CSSProperties, ReactNode } from 'react';
import { publicUploadUrl } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { HomeTextStyle, PublicHomeBlock, PublicHomeLayout } from '../../lib/homeLayout';
import { defaultHomeLayout, homeCardShellClass, normalizeHomeSlotOrder, toPreviewLayout } from '../../lib/homeLayout';
import { HomeSocialLinks } from './HomeSocialLinks';
import { GoogleReviewCard, type GoogleReviewPayload } from './GoogleReviewCard';
import { MeetingAvailabilityBoard, type MeetingBoardPayload } from './MeetingAvailabilityBoard';

function textStyle(style: HomeTextStyle): CSSProperties {
  const family = style.fontFamily || 'Plus Jakarta Sans';
  return {
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight === 'semibold' ? 600 : style.fontWeight === 'bold' ? 700 : 400,
    fontStyle: style.fontStyle,
    fontFamily: `"${family}", ui-sans-serif, system-ui, sans-serif`,
    color: style.color,
    textAlign: style.align,
    letterSpacing: `${style.letterSpacing || 0}px`,
    textDecoration: style.decoration === 'none' || !style.decoration ? 'none' : style.decoration,
    textTransform: style.textTransform || 'none',
  };
}

function blockSpaceStyle(block: { spaceTop?: number; spaceBottom?: number }): CSSProperties {
  return {
    marginTop: `${Math.max(0, Number(block.spaceTop) || 0)}px`,
    marginBottom: `${Math.max(0, Number(block.spaceBottom) || 0)}px`,
  };
}

function TextBlockView({
  text,
  style,
  className,
}: {
  text: string;
  style: HomeTextStyle;
  className?: string;
}) {
  if (!text.trim()) return null;

  const rotate = Number(style.rotate) || 0;
  const curve = style.curve || 'none';
  const base = textStyle(style);
  const justify =
    style.align === 'left' ? 'justify-start' : style.align === 'right' ? 'justify-end' : 'justify-center';

  const shell = (children: ReactNode) => (
    <div
      className={cn('w-full', className)}
      style={{
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );

  if (curve === 'up' || curve === 'down') {
    const chars = Array.from(text);
    const mid = (chars.length - 1) / 2;
    const step = Math.min(10, Math.max(4, 48 / Math.max(chars.length, 1)));
    return shell(
      <p className={cn('flex flex-wrap', justify)} style={{ ...base, textAlign: undefined }}>
        {chars.map((ch, index) => {
          const offset = index - mid;
          const bend = curve === 'up' ? 1 : -1;
          const charRotate = offset * step * bend * 0.35;
          const lift = Math.abs(offset) * step * 0.55 * bend;
          return (
            <span
              key={`${index}-${ch}`}
              style={{
                display: 'inline-block',
                transform: `translateY(${-lift}px) rotate(${charRotate}deg)`,
                whiteSpace: 'pre',
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          );
        })}
      </p>
    );
  }

  return shell(
    <p className="whitespace-pre-wrap break-words" style={base}>
      {text}
    </p>
  );
}

function ImageView({ block }: { block: Extract<PublicHomeBlock, { kind: 'image' }> }) {
  const fromUrl = block.source === 'url' || (Boolean(block.url) && !block.file);
  const src = fromUrl ? block.url || '' : publicUploadUrl(block.file) || '';
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className="max-h-56 w-full rounded-2xl border border-line object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(event) => {
        (event.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function BlockView({ block }: { block: PublicHomeBlock }) {
  const space = blockSpaceStyle(block);
  if (block.kind === 'image') {
    return (
      <div style={space}>
        <ImageView block={block} />
      </div>
    );
  }
  if (block.kind === 'links') {
    return (
      <div style={space}>
        <HomeSocialLinks items={block.items} iconStyle={block.iconStyle} />
      </div>
    );
  }
  return (
    <div style={space}>
      <TextBlockView
        text={block.text}
        style={block.style}
        className={block.kind === 'subtitle' && block.style.curve === 'none' ? 'tracking-[0.16em]' : undefined}
      />
    </div>
  );
}

function defaultLayout(organizationName: string): PublicHomeLayout {
  return toPreviewLayout(defaultHomeLayout(organizationName));
}

export function HomeElements({
  layout,
  organizationName,
  meetingBoard,
  googleReview,
  className,
}: {
  layout?: PublicHomeLayout | null;
  organizationName: string;
  meetingBoard?: MeetingBoardPayload | null;
  googleReview?: GoogleReviewPayload | null;
  className?: string;
}) {
  const resolved =
    layout && Array.isArray(layout.cards) && layout.cards.length ? layout : defaultLayout(organizationName);

  const cards = resolved.cards.filter((card) => card.blocks?.length);
  const showBoard = Boolean(resolved.meetingBoardEnabled && meetingBoard?.items?.length);
  const showReview = Boolean(googleReview?.url);
  const slotOrder = normalizeHomeSlotOrder(resolved.homeSlotOrder);

  if (!cards.length && !showBoard && !showReview) return null;

  const cardsBlock = cards.length ? (
    <div key="home-cards" className="space-y-0">
      {cards.map((card) => (
        <div key={card.id} className={homeCardShellClass(card.frame)}>
          <div>
            {card.blocks.map((block) => (
              <BlockView key={block.id} block={block} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn('space-y-0', className)}>
      {slotOrder.map((slot) => {
        if (slot === 'meetingBoard' && showBoard) {
          return (
            <MeetingAvailabilityBoard
              key="meetingBoard"
              board={meetingBoard}
              organizationName={organizationName}
            />
          );
        }
        if (slot === 'googleReview' && showReview) {
          return <GoogleReviewCard key="googleReview" review={googleReview} />;
        }
        if (slot === 'cards' && cardsBlock) return cardsBlock;
        return null;
      })}
    </div>
  );
}
