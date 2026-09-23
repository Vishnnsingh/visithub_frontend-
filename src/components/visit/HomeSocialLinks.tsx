import {
  Facebook01Icon,
  InstagramIcon,
  Link01Icon,
  Linkedin01Icon,
  NewTwitterIcon,
  TwitterIcon,
  WhatsappIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from '../../lib/cn';
import type { HomeLinkIconStyle, HomeLinkPlatform, PublicHomeLinkItem } from '../../lib/homeLayout';

const PLATFORM_ICON: Record<Exclude<HomeLinkPlatform, 'custom'>, IconSvgElement> = {
  instagram: InstagramIcon,
  facebook: Facebook01Icon,
  whatsapp: WhatsappIcon,
  youtube: YoutubeIcon,
  linkedin: Linkedin01Icon,
  twitter: TwitterIcon,
  x: NewTwitterIcon,
};

function iconShellClass(style: HomeLinkIconStyle) {
  if (style === 'filled') return 'bg-primary text-white';
  if (style === 'outline') return 'border-2 border-primary bg-transparent text-primary';
  if (style === 'soft') return 'bg-primary/10 text-primary';
  return 'bg-transparent text-primary';
}

export function HomeSocialLinks({
  items,
  iconStyle = 'filled',
  className,
}: {
  items: PublicHomeLinkItem[];
  iconStyle?: HomeLinkIconStyle;
  className?: string;
}) {
  const visible = items.filter((item) => item.url).slice(0, 5);
  if (!visible.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
      {visible.map((item) => {
        if (item.platform === 'custom') {
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              <span className="truncate">{item.label || 'Link'}</span>
            </a>
          );
        }

        const icon = PLATFORM_ICON[item.platform] || Link01Icon;
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.platform}
            className={cn(
              'grid size-11 place-items-center rounded-full transition active:scale-95',
              iconShellClass(iconStyle)
            )}
          >
            <HugeiconsIcon icon={icon} size={20} color="currentColor" strokeWidth={1.8} />
          </a>
        );
      })}
    </div>
  );
}
