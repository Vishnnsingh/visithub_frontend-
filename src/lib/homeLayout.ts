export type HomeTextStyle = {
  fontSize: number;
  fontWeight: 'normal' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  /** Tilt in degrees (−45…45) */
  rotate: number;
  /** Arc bend */
  curve: 'none' | 'up' | 'down';
  decoration: 'none' | 'underline' | 'line-through';
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
};

export type HomeTextKind = 'heading' | 'subtitle' | 'paragraph';

export type HomeLinkPlatform =
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'youtube'
  | 'linkedin'
  | 'twitter'
  | 'x'
  | 'custom';

export type HomeLinkIconStyle = 'filled' | 'outline' | 'soft' | 'minimal';

export type HomeTextBlock = {
  id: string;
  kind: HomeTextKind;
  enabled: boolean;
  text: string;
  style: HomeTextStyle;
  spaceTop: number;
  spaceBottom: number;
  /** Max words allowed in this text block */
  maxWords: number;
};

export type HomeImageBlock = {
  id: string;
  kind: 'image';
  enabled: boolean;
  /** upload = file in uploads/; url = external image link */
  source: 'upload' | 'url';
  file: string;
  url: string;
  spaceTop: number;
  spaceBottom: number;
};

export type HomeLinkItem = {
  id: string;
  platform: HomeLinkPlatform;
  url: string;
  label: string;
  enabled: boolean;
};

export type HomeLinksBlock = {
  id: string;
  kind: 'links';
  enabled: boolean;
  iconStyle: HomeLinkIconStyle;
  items: HomeLinkItem[];
  spaceTop: number;
  spaceBottom: number;
};

export type HomeBlock = HomeTextBlock | HomeImageBlock | HomeLinksBlock;

export type HomeCard = {
  id: string;
  enabled: boolean;
  /** card = soft corners; round = more curve; circle = pill; plain = no chrome */
  frame: 'card' | 'round' | 'circle' | 'plain';
  blocks: HomeBlock[];
};

export type HomeBgThemeId = 'default' | 'mint' | 'blossom' | 'lavender' | 'peach' | 'sky' | 'citrus';

export type HomeSlotId = 'meetingBoard' | 'googleReview' | 'cards';

export const HOME_SLOT_IDS: HomeSlotId[] = ['meetingBoard', 'googleReview', 'cards'];
export const DEFAULT_HOME_SLOT_ORDER: HomeSlotId[] = ['meetingBoard', 'cards', 'googleReview'];

export function normalizeHomeSlotOrder(raw: unknown): HomeSlotId[] {
  const seen = new Set<HomeSlotId>();
  const next: HomeSlotId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'string') continue;
      if (!(HOME_SLOT_IDS as string[]).includes(item)) continue;
      const slot = item as HomeSlotId;
      if (seen.has(slot)) continue;
      seen.add(slot);
      next.push(slot);
    }
  }
  for (const slot of DEFAULT_HOME_SLOT_ORDER) {
    if (!seen.has(slot)) next.push(slot);
  }
  return next;
}

export function moveHomeSlot(order: HomeSlotId[], slot: HomeSlotId, direction: -1 | 1): HomeSlotId[] {
  const current = normalizeHomeSlotOrder(order);
  const index = current.indexOf(slot);
  if (index < 0) return current;
  const target = index + direction;
  if (target < 0 || target >= current.length) return current;
  const next = [...current];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export type HomeLayout = {
  cards: HomeCard[];
  /** Default visitor Home BG — visitors can override personally on their phone */
  bgTheme: HomeBgThemeId;
  /** Person-to-meet availability notice board on visitor Home */
  meetingBoardEnabled?: boolean;
  /** Visitor Home section order */
  homeSlotOrder?: HomeSlotId[];
  updatedAt?: string;
};

export type PublicHomeLinkItem = {
  id: string;
  platform: HomeLinkPlatform;
  url: string;
  label: string;
};

export type PublicHomeBlock =
  | { id: string; kind: HomeTextKind; text: string; style: HomeTextStyle; spaceTop: number; spaceBottom: number }
  | { id: string; kind: 'image'; file?: string; url?: string; source?: 'upload' | 'url'; spaceTop: number; spaceBottom: number }
  | {
      id: string;
      kind: 'links';
      iconStyle: HomeLinkIconStyle;
      items: PublicHomeLinkItem[];
      spaceTop: number;
      spaceBottom: number;
    };

export type PublicHomeCard = {
  id: string;
  frame: 'card' | 'round' | 'circle' | 'plain';
  blocks: PublicHomeBlock[];
};

export type PublicHomeLayout = {
  cards: PublicHomeCard[];
  bgTheme: HomeBgThemeId;
  meetingBoardEnabled?: boolean;
  homeSlotOrder?: HomeSlotId[];
};

export const MAX_HOME_LINKS = 5;
export const MAX_BLOCK_SPACE = 48;
export const MIN_TEXT_WORDS = 1;
export const MAX_TEXT_WORDS = 100;
export const MAX_UPLOAD_IMAGES = 5;
export const MAX_URL_IMAGES = 30;

export function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function clampMaxWords(value: unknown, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_TEXT_WORDS, Math.max(MIN_TEXT_WORDS, Math.round(n)));
}

export function limitToWords(text: string, maxWords: number) {
  const limit = clampMaxWords(maxWords, 30);
  const parts = text.trimStart().split(/(\s+)/);
  let words = 0;
  let out = '';
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (words > 0) out += part;
      continue;
    }
    if (words >= limit) break;
    out += part;
    words += 1;
  }
  return out;
}

export function defaultMaxWords(kind: HomeTextKind) {
  if (kind === 'subtitle') return 12;
  if (kind === 'heading') return 20;
  return 60;
}

export const HOME_LINK_PLATFORM_OPTIONS: Array<{ value: HomeLinkPlatform; label: string }> = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'youtube', label: 'YouTube / Channel' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'x', label: 'X' },
  { value: 'custom', label: 'Custom link (name)' },
];

export const HOME_LINK_ICON_STYLE_OPTIONS: Array<{ value: HomeLinkIconStyle; label: string }> = [
  { value: 'filled', label: 'Filled' },
  { value: 'outline', label: 'Outline' },
  { value: 'soft', label: 'Soft' },
  { value: 'minimal', label: 'Minimal' },
];

/** 28 font families for Text style dropdown */
export const HOME_FONT_OPTIONS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Ubuntu', label: 'Ubuntu' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Work Sans', label: 'Work Sans' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Rubik', label: 'Rubik' },
  { value: 'Mulish', label: 'Mulish' },
  { value: 'Josefin Sans', label: 'Josefin Sans' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Dancing Script', label: 'Dancing Script' },
] as const;

export const HOME_FONT_FAMILY_VALUES = HOME_FONT_OPTIONS.map((item) => item.value);

export const HOME_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
] as const;

export const HOME_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

export const HOME_CURVE_OPTIONS = [
  { value: 'none', label: 'Straight' },
  { value: 'up', label: 'Curve up' },
  { value: 'down', label: 'Curve down' },
] as const;

export const HOME_DECORATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'underline', label: 'Underline' },
  { value: 'line-through', label: 'Strike' },
] as const;

export const HOME_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'As typed' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
] as const;

export const HOME_CARD_FRAME_OPTIONS = [
  { value: 'card', label: 'Soft corners' },
  { value: 'round', label: 'More curve' },
  { value: 'circle', label: 'Pill / circle' },
  { value: 'plain', label: 'No card (no border)' },
] as const;

export type HomeCardFrame = (typeof HOME_CARD_FRAME_OPTIONS)[number]['value'];

export function normalizeCardFrame(value: unknown): HomeCardFrame {
  if (value === 'plain' || value === 'round' || value === 'circle' || value === 'card') return value;
  return 'card';
}

export function homeCardShellClass(frame: HomeCardFrame | string | undefined) {
  const resolved = normalizeCardFrame(frame);
  if (resolved === 'plain') return 'px-1 py-2';
  if (resolved === 'circle') {
    return 'mb-3 rounded-[2.75rem] border border-line bg-card px-5 py-7 shadow-[0_14px_34px_rgba(15,39,68,0.07)]';
  }
  if (resolved === 'round') {
    return 'mb-3 rounded-[2.25rem] border border-line bg-card px-5 py-6 shadow-[0_12px_30px_rgba(15,39,68,0.06)]';
  }
  return 'mb-3 rounded-[1.75rem] border border-line bg-card px-5 py-6 shadow-[0_12px_30px_rgba(15,39,68,0.06)]';
}

export function defaultHomeStyle(overrides?: Partial<HomeTextStyle>): HomeTextStyle {
  return {
    fontSize: 16,
    fontWeight: 'semibold',
    fontStyle: 'normal',
    fontFamily: 'Plus Jakarta Sans',
    color: '#111827',
    align: 'center',
    rotate: 0,
    curve: 'none',
    decoration: 'none',
    letterSpacing: 0,
    textTransform: 'none',
    ...overrides,
  };
}

function newId(prefix = 'home') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function clampBlockSpace(value: unknown, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_BLOCK_SPACE, Math.max(0, Math.round(n)));
}

export function createTextBlock(kind: HomeTextKind, text = ''): HomeTextBlock {
  const style =
    kind === 'heading'
      ? defaultHomeStyle({ fontSize: 24, fontWeight: 'bold' })
      : kind === 'subtitle'
        ? defaultHomeStyle({ fontSize: 12, fontWeight: 'semibold', color: '#6b7280' })
        : defaultHomeStyle({ fontSize: 14, fontWeight: 'normal' });
  const maxWords = defaultMaxWords(kind);
  return {
    id: newId('blk'),
    kind,
    enabled: true,
    text: limitToWords(text, maxWords),
    style,
    spaceTop: 0,
    spaceBottom: 0,
    maxWords,
  };
}

export function createLinksBlock(): HomeLinksBlock {
  return {
    id: newId('links'),
    kind: 'links',
    enabled: true,
    iconStyle: 'filled',
    items: [],
    spaceTop: 12,
    spaceBottom: 4,
  };
}

export function createUrlImageBlock(url: string): HomeImageBlock {
  return {
    id: newId('img'),
    kind: 'image',
    enabled: true,
    source: 'url',
    file: '',
    url: normalizeHomeUrl(url),
    spaceTop: 8,
    spaceBottom: 8,
  };
}

export function imageSrc(block: { file?: string; url?: string; source?: string }) {
  if (block.source === 'url' || (block.url && !block.file)) {
    return block.url || '';
  }
  return block.file || '';
}

export function isUploadImage(block: HomeImageBlock | { kind?: string; source?: string; file?: string; url?: string }) {
  if (block.kind && block.kind !== 'image') return false;
  return block.source === 'upload' || (Boolean(block.file) && !block.url);
}

export function createLinkItem(platform: HomeLinkPlatform = 'instagram'): HomeLinkItem {
  return {
    id: newId('link'),
    platform,
    url: '',
    label: platform === 'custom' ? 'Visit link' : '',
    enabled: true,
  };
}

export function createHomeCard(blocks: HomeBlock[] = []): HomeCard {
  return { id: newId('card'), enabled: true, frame: 'card', blocks };
}

export const HOME_BG_THEME_IDS = [
  'default',
  'mint',
  'blossom',
  'lavender',
  'peach',
  'sky',
  'citrus',
] as const;

export function isHomeBgThemeId(value: unknown): value is HomeBgThemeId {
  return typeof value === 'string' && (HOME_BG_THEME_IDS as readonly string[]).includes(value);
}

export function defaultHomeLayout(organizationName: string): HomeLayout {
  const name = organizationName?.trim() || 'Organisation';

  const welcomeSub = createTextBlock('subtitle', 'Welcome to');
  welcomeSub.style = defaultHomeStyle({
    fontSize: 11,
    fontWeight: 'semibold',
    fontFamily: 'Manrope',
    color: '#0d9488',
    letterSpacing: 4,
    textTransform: 'uppercase',
  });
  const welcomeHead = createTextBlock('heading', name);
  welcomeHead.style = defaultHomeStyle({
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Playfair Display',
    color: '#0f172a',
    curve: 'up',
    letterSpacing: 0,
  });
  welcomeHead.spaceTop = 4;
  const welcomePara = createTextBlock(
    'paragraph',
    'Check in, meet your host, and share visit feedback — all in one place.'
  );
  welcomePara.style = defaultHomeStyle({
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'italic',
    fontFamily: 'DM Sans',
    color: '#475569',
  });
  welcomePara.spaceTop = 10;
  const welcomeImage = createUrlImageBlock(
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80'
  );
  welcomeImage.spaceTop = 16;
  welcomeImage.spaceBottom = 2;

  const visitSub = createTextBlock('subtitle', 'Your visit');
  visitSub.style = defaultHomeStyle({
    fontSize: 11,
    fontWeight: 'semibold',
    fontFamily: 'Space Grotesk',
    color: '#0284c8',
    letterSpacing: 4,
    textTransform: 'uppercase',
    decoration: 'underline',
  });
  const visitHead = createTextBlock('heading', 'Smooth from arrival to feedback');
  visitHead.style = defaultHomeStyle({
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Outfit',
    color: '#0f172a',
    rotate: -2,
  });
  visitHead.spaceTop = 6;
  const visitPara = createTextBlock(
    'paragraph',
    'Scan the QR, tell us who you are meeting, and leave a quick rating when you leave. It helps us improve every visit.'
  );
  visitPara.style = defaultHomeStyle({
    fontSize: 14,
    fontWeight: 'normal',
    fontFamily: 'Source Sans 3',
    color: '#475569',
    align: 'center',
  });
  visitPara.spaceTop = 10;
  const visitImage = createUrlImageBlock(
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80'
  );
  visitImage.spaceTop = 14;

  const connectSub = createTextBlock('subtitle', 'Stay connected');
  connectSub.style = defaultHomeStyle({
    fontSize: 11,
    fontWeight: 'semibold',
    fontFamily: 'Josefin Sans',
    color: '#be185d',
    letterSpacing: 4,
    textTransform: 'uppercase',
  });
  const connectHead = createTextBlock('heading', `Follow ${name}`);
  connectHead.style = defaultHomeStyle({
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Pacifico',
    color: '#9d174d',
    curve: 'down',
  });
  connectHead.spaceTop = 4;
  const connectPara = createTextBlock(
    'paragraph',
    'Updates, announcements, and support — replace these links with your own social profiles anytime.'
  );
  connectPara.style = defaultHomeStyle({
    fontSize: 13,
    fontWeight: 'normal',
    fontStyle: 'italic',
    fontFamily: 'Nunito',
    color: '#64748b',
  });
  connectPara.spaceTop = 8;
  const links = createLinksBlock();
  links.iconStyle = 'filled';
  links.spaceTop = 16;
  links.spaceBottom = 2;
  links.items = [
    { ...createLinkItem('instagram'), url: 'https://instagram.com' },
    { ...createLinkItem('whatsapp'), url: 'https://wa.me' },
    { ...createLinkItem('linkedin'), url: 'https://linkedin.com' },
    { ...createLinkItem('youtube'), url: 'https://youtube.com' },
  ];

  const thanksSub = createTextBlock('subtitle', 'Thank you');
  thanksSub.style = defaultHomeStyle({
    fontSize: 11,
    fontWeight: 'semibold',
    fontFamily: 'Raleway',
    color: '#7c3aed',
    letterSpacing: 4,
    textTransform: 'uppercase',
  });
  const thanksHead = createTextBlock('heading', 'Every visit helps us grow');
  thanksHead.style = defaultHomeStyle({
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Lora',
    color: '#1e1b4b',
    curve: 'up',
  });
  thanksHead.spaceTop = 6;
  const thanksPara = createTextBlock(
    'paragraph',
    'Your check-in and feedback keep our space welcoming. We are glad you are here — see you again soon.'
  );
  thanksPara.style = defaultHomeStyle({
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'italic',
    fontFamily: 'Cormorant Garamond',
    color: '#57534e',
  });
  thanksPara.spaceTop = 10;
  const thanksImage = createUrlImageBlock(
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80'
  );
  thanksImage.spaceTop = 14;
  thanksImage.spaceBottom = 2;

  const card1 = createHomeCard([welcomeSub, welcomeHead, welcomePara, welcomeImage]);
  card1.frame = 'round';
  const card2 = createHomeCard([visitSub, visitHead, visitPara, visitImage]);
  card2.frame = 'plain';
  const card3 = createHomeCard([connectSub, connectHead, connectPara, links]);
  card3.frame = 'circle';
  const card4 = createHomeCard([thanksSub, thanksHead, thanksPara, thanksImage]);
  card4.frame = 'round';

  return {
    bgTheme: 'mint',
    meetingBoardEnabled: false,
    homeSlotOrder: [...DEFAULT_HOME_SLOT_ORDER],
    cards: [card1, card2, card3, card4],
  };
}

export function countHomeImages(layout: HomeLayout | { cards: HomeCard[] }) {
  return layout.cards.reduce(
    (sum, card) => sum + card.blocks.filter((block) => block.kind === 'image' && isUploadImage(block)).length,
    0
  );
}

export function countUrlImages(layout: HomeLayout | { cards: HomeCard[] }) {
  return layout.cards.reduce(
    (sum, card) =>
      sum +
      card.blocks.filter(
        (block) => block.kind === 'image' && (block.source === 'url' || (Boolean(block.url) && !block.file))
      ).length,
    0
  );
}

export function resolveFontFamily(fontFamily?: string) {
  if (fontFamily && HOME_FONT_FAMILY_VALUES.includes(fontFamily as (typeof HOME_FONT_FAMILY_VALUES)[number])) {
    return fontFamily;
  }
  return 'Plus Jakarta Sans';
}

export function normalizeHomeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^wa\.me\//i.test(value) || /^api\.whatsapp\.com\//i.test(value)) return `https://${value}`;
  if (/^www\./i.test(value)) return `https://${value}`;
  return `https://${value}`;
}

export function toPreviewLayout(layout: HomeLayout): PublicHomeLayout {
  return {
    bgTheme: isHomeBgThemeId(layout.bgTheme) ? layout.bgTheme : 'default',
    meetingBoardEnabled: Boolean(layout.meetingBoardEnabled),
    homeSlotOrder: normalizeHomeSlotOrder(layout.homeSlotOrder),
    cards: layout.cards
      .filter((card) => card.enabled !== false)
      .map((card) => ({
        id: card.id,
        frame: normalizeCardFrame(card.frame),
        blocks: card.blocks
          .filter((block) => block.enabled !== false)
          .map((block) => {
            if (block.kind === 'image') {
              const source =
                block.source === 'url' || (block.url && !block.file) ? ('url' as const) : ('upload' as const);
              return {
                id: block.id,
                kind: 'image' as const,
                source,
                file: source === 'upload' ? block.file : '',
                url: source === 'url' ? normalizeHomeUrl(block.url || '') : '',
                spaceTop: clampBlockSpace(block.spaceTop),
                spaceBottom: clampBlockSpace(block.spaceBottom),
              };
            }
            if (block.kind === 'links') {
              return {
                id: block.id,
                kind: 'links' as const,
                iconStyle: block.iconStyle || 'filled',
                spaceTop: clampBlockSpace(block.spaceTop, 8),
                spaceBottom: clampBlockSpace(block.spaceBottom, 8),
                items: block.items
                  .filter((item) => item.enabled !== false && item.url.trim())
                  .slice(0, MAX_HOME_LINKS)
                  .map((item) => ({
                    id: item.id,
                    platform: item.platform,
                    url: normalizeHomeUrl(item.url),
                    label: item.label?.trim() || (item.platform === 'custom' ? 'Link' : ''),
                  })),
              };
            }
            return {
              id: block.id,
              kind: block.kind,
              text: block.text,
              spaceTop: clampBlockSpace(block.spaceTop),
              spaceBottom: clampBlockSpace(block.spaceBottom),
              style: {
                ...block.style,
                fontFamily: resolveFontFamily(block.style.fontFamily),
              },
            };
          })
          .filter((block) => {
            if (block.kind === 'image') return Boolean(imageSrc(block));
            if (block.kind === 'links') return block.items.length > 0;
            return Boolean(block.text?.trim());
          }),
      }))
      .filter((card) => card.blocks.length > 0),
  };
}
