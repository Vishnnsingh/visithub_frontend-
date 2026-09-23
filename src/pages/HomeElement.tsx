import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Delete02Icon,
  ImageAdd01Icon,
  Link01Icon,
  SquareIcon,
  TextAlignLeftIcon,
  TextBoldIcon,
  TextFontIcon,
  Tick02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { SelectField } from '../components/ui/Fields';
import { HomeElements } from '../components/visit/HomeElements';
import type { GoogleReviewPayload } from '../components/visit/GoogleReviewCard';
import type { MeetingBoardPayload } from '../components/visit/MeetingAvailabilityBoard';
import { HomeSocialLinks } from '../components/visit/HomeSocialLinks';
import { api, getApiErrorMessage, publicUploadUrl } from '../lib/api';
import { cn } from '../lib/cn';
import { compressImage } from '../lib/compressImage';
import {
  HOME_ALIGN_OPTIONS,
  HOME_CARD_FRAME_OPTIONS,
  HOME_CURVE_OPTIONS,
  HOME_DECORATION_OPTIONS,
  HOME_FONT_OPTIONS,
  HOME_LINK_ICON_STYLE_OPTIONS,
  HOME_LINK_PLATFORM_OPTIONS,
  HOME_TRANSFORM_OPTIONS,
  HOME_WEIGHT_OPTIONS,
  MAX_HOME_LINKS,
  MAX_BLOCK_SPACE,
  MAX_TEXT_WORDS,
  MAX_UPLOAD_IMAGES,
  MAX_URL_IMAGES,
  MIN_TEXT_WORDS,
  clampMaxWords,
  countHomeImages,
  countUrlImages,
  countWords,
  createHomeCard,
  createLinkItem,
  createLinksBlock,
  createTextBlock,
  createUrlImageBlock,
  defaultHomeLayout,
  defaultMaxWords,
  isHomeBgThemeId,
  isUploadImage,
  limitToWords,
  normalizeHomeUrl,
  resolveFontFamily,
  toPreviewLayout,
  normalizeCardFrame,
  type HomeBgThemeId,
  type HomeBlock,
  type HomeCard,
  type HomeLayout,
  type HomeLinksBlock,
  type HomeTextBlock,
  type HomeTextKind,
  moveHomeSlot,
  normalizeHomeSlotOrder,
} from '../lib/homeLayout';
import { VISIT_THEMES, visitThemeClass } from '../lib/visitTheme';
import { useActiveOrgAuth } from '../lib/useActiveOrgAuth';

const MAX_IMAGES = MAX_UPLOAD_IMAGES;
const MAX_BYTES = 5 * 1024 * 1024;

const KIND_META: Record<HomeTextKind, { title: string; hint: string }> = {
  subtitle: { title: 'Subtitle', hint: 'Small line above the heading.' },
  heading: { title: 'Heading', hint: 'Main title on visitor Home.' },
  paragraph: { title: 'Paragraph', hint: 'Supporting text under the heading.' },
};

function SpaceControls({
  spaceTop,
  spaceBottom,
  onChange,
}: {
  spaceTop: number;
  spaceBottom: number;
  onChange: (next: { spaceTop: number; spaceBottom: number }) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium text-fog">
        Space above ({spaceTop}px)
        <input
          type="range"
          min={0}
          max={MAX_BLOCK_SPACE}
          step={2}
          value={spaceTop}
          className="mt-2 w-full accent-primary"
          onChange={(event) => onChange({ spaceTop: Number(event.target.value), spaceBottom })}
        />
      </label>
      <label className="block text-sm font-medium text-fog">
        Space below ({spaceBottom}px)
        <input
          type="range"
          min={0}
          max={MAX_BLOCK_SPACE}
          step={2}
          value={spaceBottom}
          className="mt-2 w-full accent-primary"
          onChange={(event) => onChange({ spaceTop, spaceBottom: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

function TextEditor({
  block,
  onChange,
  onRemove,
}: {
  block: HomeTextBlock;
  onChange: (next: HomeTextBlock) => void;
  onRemove: () => void;
}) {
  const meta = KIND_META[block.kind];
  const maxWords = clampMaxWords(block.maxWords, defaultMaxWords(block.kind));
  const wordsUsed = countWords(block.text);
  const patchStyle = (patch: Partial<HomeTextBlock['style']>) =>
    onChange({ ...block, style: { ...block.style, ...patch } });

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{meta.title}</h3>
          <p className="mt-0.5 text-xs text-mute">{meta.hint}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-fog">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(event) => onChange({ ...block, enabled: event.target.checked })}
          />
          Show
        </label>
      </div>

      <div className="mt-3 space-y-3">
        <label className="block text-sm font-medium text-fog">
          Max words ({maxWords})
          <input
            type="range"
            min={MIN_TEXT_WORDS}
            max={MAX_TEXT_WORDS}
            step={1}
            value={maxWords}
            className="mt-2 w-full accent-primary"
            onChange={(event) => {
              const nextMax = Number(event.target.value);
              onChange({
                ...block,
                maxWords: nextMax,
                text: limitToWords(block.text, nextMax),
              });
            }}
          />
        </label>
        <div>
          <textarea
            className="field-input min-h-20 !pl-4"
            value={block.text}
            placeholder={`${meta.title} text`}
            onChange={(event) =>
              onChange({ ...block, text: limitToWords(event.target.value, maxWords) })
            }
          />
          <p className="mt-1 text-right text-[11px] font-medium text-mute">
            {wordsUsed}/{maxWords} words
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-fog sm:col-span-2">
            Text size ({block.style.fontSize}px)
            <input
              type="range"
              min={10}
              max={40}
              step={1}
              value={block.style.fontSize}
              className="mt-2 w-full accent-primary"
              onChange={(event) => patchStyle({ fontSize: Number(event.target.value) })}
            />
          </label>
          <SelectField
            label="Text style"
            plain
            icon={TextFontIcon}
            value={resolveFontFamily(block.style.fontFamily)}
            options={[...HOME_FONT_OPTIONS]}
            onChange={(event) => patchStyle({ fontFamily: event.target.value })}
          />
          <label className="block text-sm font-medium text-fog">
            Text color
            <input
              type="color"
              value={block.style.color}
              className="field-input mt-1.5 h-11 w-full cursor-pointer !pl-3"
              onChange={(event) => patchStyle({ color: event.target.value })}
            />
          </label>
          <SelectField
            label="Weight"
            plain
            icon={TextBoldIcon}
            value={block.style.fontWeight}
            options={[...HOME_WEIGHT_OPTIONS]}
            onChange={(event) =>
              patchStyle({ fontWeight: event.target.value as HomeTextBlock['style']['fontWeight'] })
            }
          />
          <SelectField
            label="Align"
            plain
            icon={TextAlignLeftIcon}
            value={block.style.align}
            options={[...HOME_ALIGN_OPTIONS]}
            onChange={(event) => patchStyle({ align: event.target.value as HomeTextBlock['style']['align'] })}
          />
          <label className="block text-sm font-medium text-fog sm:col-span-2">
            Tilt / tirchha ({block.style.rotate || 0}°)
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={block.style.rotate || 0}
              className="mt-2 w-full accent-primary"
              onChange={(event) => patchStyle({ rotate: Number(event.target.value) })}
            />
          </label>
          <SelectField
            label="Curve"
            plain
            icon={TextFontIcon}
            value={block.style.curve || 'none'}
            options={[...HOME_CURVE_OPTIONS]}
            onChange={(event) =>
              patchStyle({ curve: event.target.value as HomeTextBlock['style']['curve'] })
            }
          />
          <SelectField
            label="Decoration"
            plain
            icon={TextBoldIcon}
            value={block.style.decoration || 'none'}
            options={[...HOME_DECORATION_OPTIONS]}
            onChange={(event) =>
              patchStyle({ decoration: event.target.value as HomeTextBlock['style']['decoration'] })
            }
          />
          <SelectField
            label="Case"
            plain
            icon={TextFontIcon}
            value={block.style.textTransform || 'none'}
            options={[...HOME_TRANSFORM_OPTIONS]}
            onChange={(event) =>
              patchStyle({ textTransform: event.target.value as HomeTextBlock['style']['textTransform'] })
            }
          />
          <label className="block text-sm font-medium text-fog">
            Letter space ({block.style.letterSpacing || 0}px)
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={block.style.letterSpacing || 0}
              className="mt-2 w-full accent-primary"
              onChange={(event) => patchStyle({ letterSpacing: Number(event.target.value) })}
            />
          </label>
        </div>
        <SpaceControls
          spaceTop={block.spaceTop || 0}
          spaceBottom={block.spaceBottom || 0}
          onChange={(next) => onChange({ ...block, ...next })}
        />
        <button type="button" onClick={onRemove} className="text-xs font-semibold text-danger">
          Remove {meta.title.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function ImageEditor({
  block,
  onChange,
  onRemove,
}: {
  block: Extract<HomeBlock, { kind: 'image' }>;
  onChange: (next: Extract<HomeBlock, { kind: 'image' }>) => void;
  onRemove: () => void;
}) {
  const fromUrl = block.source === 'url' || (Boolean(block.url) && !block.file);
  const preview = fromUrl ? block.url : publicUploadUrl(block.file) || '';

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{fromUrl ? 'Image from URL' : 'Uploaded image'}</h3>
          <p className="mt-0.5 text-xs text-mute">
            {fromUrl
              ? 'External link — does not count toward the 5 upload limit.'
              : 'Counts toward the home-wide upload limit of 5.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-fog">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(event) => onChange({ ...block, enabled: event.target.checked })}
          />
          Show
        </label>
      </div>
      {preview ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
          <img
            src={preview}
            alt=""
            className="h-40 w-full object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.opacity = '0.35';
            }}
          />
        </div>
      ) : (
        <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-line bg-white text-xs text-mute">
          Paste an image URL below
        </div>
      )}
      {fromUrl ? (
        <label className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">Image URL</span>
          <input
            type="url"
            value={block.url || ''}
            onChange={(event) =>
              onChange({
                ...block,
                source: 'url',
                file: '',
                url: event.target.value,
              })
            }
            placeholder="https://…"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
      ) : null}
      <div className="mt-3">
        <SpaceControls
          spaceTop={block.spaceTop || 0}
          spaceBottom={block.spaceBottom || 0}
          onChange={(next) => onChange({ ...block, ...next })}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-danger"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
        Remove image
      </button>
    </div>
  );
}

function LinksEditor({
  block,
  onChange,
  onRemove,
}: {
  block: HomeLinksBlock;
  onChange: (next: HomeLinksBlock) => void;
  onRemove: () => void;
}) {
  const updateItem = (id: string, patch: Partial<(typeof block.items)[number]>) => {
    onChange({
      ...block,
      items: block.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (id: string) => {
    onChange({
      ...block,
      items: block.items.filter((item) => item.id !== id),
    });
  };

  const addItem = () => {
    if (block.items.length >= MAX_HOME_LINKS) {
      toast.error(`Max ${MAX_HOME_LINKS} links in one row`);
      return;
    }
    onChange({
      ...block,
      items: [...block.items, createLinkItem('instagram')],
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Links / Social</h3>
          <p className="mt-0.5 text-xs text-mute">
            Max {MAX_HOME_LINKS} in one row. Leave URL empty for now — fill later. Icons use visitor CTA color.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-fog">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(event) => onChange({ ...block, enabled: event.target.checked })}
          />
          Show
        </label>
      </div>

      <div className="mt-3 max-w-sm">
        <SelectField
          label="Icon design"
          plain
          icon={Link01Icon}
          value={block.iconStyle || 'filled'}
          options={[...HOME_LINK_ICON_STYLE_OPTIONS]}
          onChange={(event) =>
            onChange({
              ...block,
              iconStyle: event.target.value as HomeLinksBlock['iconStyle'],
            })
          }
        />
      </div>

      <div className="mt-3">
        <SpaceControls
          spaceTop={block.spaceTop || 0}
          spaceBottom={block.spaceBottom || 0}
          onChange={(next) => onChange({ ...block, ...next })}
        />
      </div>

      <div className="mt-3 space-y-3">
        {block.items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-line bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Link {index + 1}</p>
              <button type="button" onClick={() => removeItem(item.id)} className="text-xs font-semibold text-danger">
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Type"
                plain
                icon={Link01Icon}
                value={item.platform}
                options={[...HOME_LINK_PLATFORM_OPTIONS]}
                onChange={(event) =>
                  updateItem(item.id, {
                    platform: event.target.value as (typeof item)['platform'],
                    label:
                      event.target.value === 'custom'
                        ? item.label || 'Visit link'
                        : item.platform === 'custom'
                          ? ''
                          : item.label,
                  })
                }
              />
              <label className="block text-sm font-medium text-fog">
                URL
                <input
                  className="field-input mt-1.5 !pl-4"
                  value={item.url}
                  placeholder="https://..."
                  onChange={(event) => updateItem(item.id, { url: event.target.value })}
                />
              </label>
              {item.platform === 'custom' ? (
                <label className="block text-sm font-medium text-fog sm:col-span-2">
                  Button name
                  <input
                    className="field-input mt-1.5 !pl-4"
                    value={item.label}
                    maxLength={40}
                    placeholder="e.g. Our website"
                    onChange={(event) => updateItem(item.id, { label: event.target.value })}
                  />
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {block.items.length ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-card px-3 py-4">
          <p className="mb-2 text-center text-[11px] font-semibold text-mute">Preview</p>
          <HomeSocialLinks
            items={block.items
              .filter((item) => item.enabled !== false && item.url.trim())
              .map((item) => ({
                id: item.id,
                platform: item.platform,
                url: item.url.startsWith('http') ? item.url : `https://${item.url}`,
                label: item.label,
              }))}
            iconStyle={block.iconStyle}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addItem}
          disabled={block.items.length >= MAX_HOME_LINKS}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog disabled:opacity-50"
        >
          + Add link ({block.items.length}/{MAX_HOME_LINKS})
        </button>
        <button type="button" onClick={onRemove} className="text-xs font-semibold text-danger">
          Remove links block
        </button>
      </div>
    </div>
  );
}

function CardEditor({
  card,
  index,
  imageCount,
  urlImageCount,
  uploading,
  canRemoveCard,
  onChange,
  onRemoveCard,
  onAddText,
  onAddLinks,
  onAddUrlImage,
  onUploadImages,
  onRemoveImage,
}: {
  card: HomeCard;
  index: number;
  imageCount: number;
  urlImageCount: number;
  uploading: boolean;
  canRemoveCard: boolean;
  onChange: (next: HomeCard) => void;
  onRemoveCard: () => void;
  onAddText: (kind: HomeTextKind) => void;
  onAddLinks: () => void;
  onAddUrlImage: (url: string) => void;
  onUploadImages: (files: FileList | null) => void;
  onRemoveImage: (id: string) => void;
}) {
  const [urlDraft, setUrlDraft] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);

  const updateBlock = (id: string, next: HomeBlock) => {
    onChange({
      ...card,
      blocks: card.blocks.map((block) => (block.id === id ? next : block)),
    });
  };

  const removeBlock = (id: string) => {
    onChange({
      ...card,
      blocks: card.blocks.filter((block) => block.id !== id),
    });
  };

  const submitUrl = () => {
    const normalized = normalizeHomeUrl(urlDraft);
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      toast.error('Enter a valid http(s) image URL');
      return;
    }
    if (urlImageCount >= MAX_URL_IMAGES) {
      toast.error(`You can add up to ${MAX_URL_IMAGES} image URLs`);
      return;
    }
    onAddUrlImage(normalized);
    setUrlDraft('');
    setUrlOpen(false);
  };

  return (
    <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Card {index + 1}</h2>
          <p className="mt-0.5 text-xs text-mute">
            Heading, subtitle, paragraph, images, and social links for visitor Home.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-fog">
            <input
              type="checkbox"
              checked={card.enabled}
              onChange={(event) => onChange({ ...card, enabled: event.target.checked })}
            />
            Show
          </label>
          {canRemoveCard ? (
            <button type="button" onClick={onRemoveCard} className="text-xs font-semibold text-danger">
              Remove card
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <SelectField
          label="Card look"
          plain
          icon={SquareIcon}
          value={normalizeCardFrame(card.frame)}
          options={[...HOME_CARD_FRAME_OPTIONS]}
          onChange={(event) =>
            onChange({ ...card, frame: normalizeCardFrame(event.target.value) })
          }
        />
      </div>

      <div className="mt-4 space-y-3">
        {card.blocks.map((block) =>
          block.kind === 'image' ? (
            <ImageEditor
              key={block.id}
              block={block}
              onChange={(next) => updateBlock(block.id, next)}
              onRemove={() => {
                if (isUploadImage(block)) onRemoveImage(block.id);
                else removeBlock(block.id);
              }}
            />
          ) : block.kind === 'links' ? (
            <LinksEditor
              key={block.id}
              block={block}
              onChange={(next) => updateBlock(block.id, next)}
              onRemove={() => removeBlock(block.id)}
            />
          ) : (
            <TextEditor
              key={block.id}
              block={block}
              onChange={(next) => updateBlock(block.id, next)}
              onRemove={() => removeBlock(block.id)}
            />
          )
        )}
        {!card.blocks.length ? <p className="text-sm text-mute">No content in this card yet.</p> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-line bg-bg/50 p-4">
        <p className="text-xs font-semibold text-ink">Add in this card</p>
        <p className="mt-1 text-[11px] text-mute">
          Text unlimited. Links max {MAX_HOME_LINKS}/row. Uploads {imageCount}/{MAX_IMAGES}. Image URLs{' '}
          {urlImageCount}/{MAX_URL_IMAGES}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddText('subtitle')}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog"
          >
            + Subtitle
          </button>
          <button
            type="button"
            onClick={() => onAddText('heading')}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog"
          >
            + Heading
          </button>
          <button
            type="button"
            onClick={() => onAddText('paragraph')}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog"
          >
            + Paragraph
          </button>
          <button
            type="button"
            onClick={onAddLinks}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog"
          >
            + Links
          </button>
          <label
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white',
              imageCount >= MAX_IMAGES || uploading ? 'cursor-not-allowed bg-mute' : 'bg-primary'
            )}
          >
            <HugeiconsIcon icon={ImageAdd01Icon} size={14} color="currentColor" strokeWidth={1.8} />
            {uploading ? 'Uploading...' : '+ Upload'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              disabled={uploading || imageCount >= MAX_IMAGES}
              onChange={(event) => {
                onUploadImages(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setUrlOpen((open) => !open)}
            disabled={urlImageCount >= MAX_URL_IMAGES}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
              urlImageCount >= MAX_URL_IMAGES
                ? 'cursor-not-allowed border-line text-mute'
                : 'border-primary/30 bg-primary/5 text-primary'
            )}
          >
            <HugeiconsIcon icon={Link01Icon} size={14} color="currentColor" strokeWidth={1.8} />
            + Image URL
          </button>
        </div>
        {urlOpen ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="url"
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
              className="w-full flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={submitUrl}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Add URL
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HomeElementPage() {
  const queryClient = useQueryClient();
  const { user: homeUser } = useActiveOrgAuth();
  const orgName = homeUser?.fullName || 'Organisation';
  const [layout, setLayout] = useState<HomeLayout>(() => defaultHomeLayout('Organisation'));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);

  const imageCount = countHomeImages(layout);
  const urlImageCount = countUrlImages(layout);

  const { data, isLoading, error } = useQuery({
    queryKey: ['home-element'],
    queryFn: async () => {
      const response = await api.get('/organisation/home-element');
      return response.data.data as HomeLayout;
    },
  });

  const presenceQuery = useQuery({
    queryKey: ['organisation-presence'],
    queryFn: async () => {
      const response = await api.get('/organisation/presence');
      return response.data.data as {
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
      };
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings-today'],
    queryFn: async () => {
      const response = await api.get('/visitor/meetings');
      return response.data.data as {
        date?: string;
        items?: Array<{
          name: string;
          status: 'yes' | 'no' | null;
          label?: string;
          nextAvailableDate?: string | null;
          nextAvailableInDays?: number | null;
        }>;
      };
    },
  });

  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!data?.cards || bootstrapped.current) return;
    bootstrapped.current = true;
    setLayout({
      ...data,
      bgTheme: isHomeBgThemeId(data.bgTheme) ? data.bgTheme : 'default',
      meetingBoardEnabled: Boolean(data.meetingBoardEnabled),
      homeSlotOrder: normalizeHomeSlotOrder(data.homeSlotOrder),
      cards: data.cards.map((card) => ({
        ...card,
        frame: normalizeCardFrame(card.frame),
        blocks: card.blocks.map((block) => ({
          ...block,
          spaceTop: Number(block.spaceTop) || 0,
          spaceBottom: Number(block.spaceBottom) || 0,
          ...(block.kind === 'image'
            ? {
                source:
                  block.source === 'url' || (block.url && !block.file) ? ('url' as const) : ('upload' as const),
                file: block.file || '',
                url: block.url || '',
              }
            : {}),
          ...(block.kind === 'heading' || block.kind === 'subtitle' || block.kind === 'paragraph'
            ? { maxWords: clampMaxWords(block.maxWords, defaultMaxWords(block.kind)) }
            : {}),
        })),
      })),
    });
  }, [data]);

  const toSavePayload = (payload: HomeLayout) => ({
    bgTheme: isHomeBgThemeId(payload.bgTheme) ? payload.bgTheme : 'default',
    meetingBoardEnabled: Boolean(payload.meetingBoardEnabled),
    homeSlotOrder: normalizeHomeSlotOrder(payload.homeSlotOrder),
    cards: payload.cards.map((card) => ({
      id: card.id,
      enabled: card.enabled !== false,
      frame: normalizeCardFrame(card.frame),
      blocks: card.blocks.map((block) => {
        if (block.kind === 'image') {
          const fromUrl = block.source === 'url' || (Boolean(block.url) && !block.file);
          return {
            id: block.id,
            kind: 'image',
            enabled: block.enabled !== false,
            source: fromUrl ? 'url' : 'upload',
            file: fromUrl ? '' : block.file || '',
            url: fromUrl ? normalizeHomeUrl(block.url || '') : '',
            spaceTop: block.spaceTop || 0,
            spaceBottom: block.spaceBottom || 0,
          };
        }
        if (block.kind === 'links') {
          return {
            id: block.id,
            kind: 'links',
            enabled: block.enabled !== false,
            iconStyle: block.iconStyle || 'filled',
            spaceTop: block.spaceTop || 0,
            spaceBottom: block.spaceBottom || 0,
            items: block.items.map((item) => ({
              id: item.id,
              platform: item.platform,
              url: item.url,
              label: item.label || '',
              enabled: item.enabled !== false,
            })),
          };
        }
        return {
          id: block.id,
          kind: block.kind,
          enabled: block.enabled !== false,
          text: block.text,
          style: block.style,
          spaceTop: block.spaceTop || 0,
          spaceBottom: block.spaceBottom || 0,
          maxWords: clampMaxWords(block.maxWords, defaultMaxWords(block.kind)),
        };
      }),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: HomeLayout) => {
      const response = await api.put('/organisation/home-element', toSavePayload(payload));
      return response.data.data as HomeLayout;
    },
    onSuccess: (next) => {
      setLayout(next);
      queryClient.setQueryData(['home-element'], next);
      toast.success('Home element saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save home element')),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      // Persist current card content first so other blocks don't disappear
      await api.put('/organisation/home-element', toSavePayload(layout));
      const response = await api.delete(`/organisation/home-element/images/${id}`);
      return response.data.data as HomeLayout;
    },
    onSuccess: (next) => {
      setLayout(next);
      queryClient.setQueryData(['home-element'], next);
      toast.success('Image removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove image')),
  });

  const previewLayout = useMemo(
    () =>
      toPreviewLayout({
        ...layout,
        meetingBoardEnabled: Boolean(data?.meetingBoardEnabled ?? layout.meetingBoardEnabled),
      }),
    [layout, data?.meetingBoardEnabled]
  );

  const previewMeetingBoard = useMemo((): MeetingBoardPayload | null => {
    if (!previewLayout.meetingBoardEnabled) return null;
    const today =
      meetingsQuery.data?.date ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const items = (meetingsQuery.data?.items || []).map((item) => ({
      name: item.name,
      status: item.status,
      label: item.label || (item.status === 'yes' ? 'Yes' : item.status === 'no' ? 'Not' : 'Update shortly'),
      nextAvailableDate: item.nextAvailableDate ?? null,
      nextAvailableInDays: item.nextAvailableInDays ?? null,
    }));
    if (items.length) return { date: today, items };
    // Sample so active notice board still appears in phone preview / order
    return {
      date: today,
      items: [
        { name: 'Host A', status: 'yes', label: 'Yes' },
        { name: 'Host B', status: 'no', label: 'Not', nextAvailableDate: today, nextAvailableInDays: 1 },
        { name: 'Host C', status: null, label: 'Update shortly' },
      ],
    };
  }, [previewLayout.meetingBoardEnabled, meetingsQuery.data]);

  const previewGoogleReview = useMemo((): GoogleReviewPayload | null => {
    const url = presenceQuery.data?.googleReviewUrl?.trim() || '';
    if (!presenceQuery.data?.googleReviewEnabled || !url) return null;
    return {
      enabled: true,
      url,
      label: 'Review on Google',
      hint: 'Tap to open Google Write a review and rate with stars.',
    };
  }, [presenceQuery.data]);

  const updateCard = (cardId: string, next: HomeCard) => {
    setLayout((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.id === cardId ? next : card)),
    }));
  };

  const removeCard = (cardId: string) => {
    setLayout((current) => {
      if (current.cards.length <= 1) {
        toast.error('Keep at least one card');
        return current;
      }
      return {
        ...current,
        cards: current.cards.filter((item) => item.id !== cardId),
      };
    });
  };

  const addCard = () => {
    setLayout((current) => ({
      ...current,
      cards: [...current.cards, createHomeCard([])],
    }));
  };

  const uploadImages = async (cardId: string, files: FileList | null) => {
    if (!files?.length) return;
    if (imageCount >= MAX_IMAGES) {
      toast.error('You can add up to 5 images on Home');
      return;
    }
    const room = MAX_IMAGES - imageCount;
    const picked = [...files].slice(0, room);
    setUploadingCardId(cardId);
    try {
      // Save current card content first — otherwise upload response wipes unsaved blocks
      const savedResponse = await api.put('/organisation/home-element', toSavePayload(layout));
      const saved = savedResponse.data.data as HomeLayout;
      setLayout(saved);
      queryClient.setQueryData(['home-element'], saved);

      const form = new FormData();
      form.append('cardId', cardId);
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is larger than 5MB`);
          continue;
        }
        const compressed = await compressImage(file, file.name.replace(/\.\w+$/, '.jpg'), 1600);
        if (compressed.size > MAX_BYTES) {
          toast.error(`${file.name} is still larger than 5MB after compress`);
          continue;
        }
        form.append('images', compressed);
      }
      if (!form.getAll('images').length) return;
      const response = await api.post('/organisation/home-element/images', form);
      const next = response.data.data as HomeLayout;
      setLayout(next);
      queryClient.setQueryData(['home-element'], next);
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not upload images'));
    } finally {
      setUploadingCardId(null);
    }
  };

  return (
    <DashboardShell title="Home Element" subtitle="Control what visitors see on the Home tab.">
      {isLoading ? (
        <p className="text-sm text-mute">Loading home element...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-ink">Default Home BG</h2>
              <p className="mt-1 text-xs text-mute">
                Visitors see this theme by default. If a visitor picks their own in More, it stays only on their phone.
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {VISIT_THEMES.map((item) => {
                  const active = (layout.bgTheme || 'default') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setLayout((current) => ({ ...current, bgTheme: item.id as HomeBgThemeId }))
                      }
                      className="group flex flex-col items-center gap-1.5"
                      aria-pressed={active}
                    >
                      <span
                        className={cn(
                          'visit-theme-swatch relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 shadow-sm transition',
                          `visit-theme-swatch-${item.id}`,
                          active ? 'border-primary ring-2 ring-primary/20' : 'border-line group-hover:border-primary/40'
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-x-0 bottom-1 mx-auto grid size-5 place-items-center rounded-full bg-primary text-white shadow">
                            <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2.2} />
                          </span>
                        ) : null}
                      </span>
                      <span className={cn('text-[10px] font-semibold', active ? 'text-ink' : 'text-mute')}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-ink">Visitor Home order</h2>
              <p className="mt-1 text-xs text-mute">
                Move sections up or down. Order applies on visitor Home (notice board, home content, Google Review).
                Turn notice board / Google Review on or off from Active Fields.
              </p>
              <div className="mt-4 space-y-2">
                {normalizeHomeSlotOrder(layout.homeSlotOrder).map((slot, index, order) => {
                  const label =
                    slot === 'meetingBoard'
                      ? 'Notice board'
                      : slot === 'googleReview'
                        ? 'Google Review'
                        : 'Home content cards';
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {index + 1}. {label}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            setLayout((current) => ({
                              ...current,
                              homeSlotOrder: moveHomeSlot(
                                normalizeHomeSlotOrder(current.homeSlotOrder),
                                slot,
                                -1
                              ),
                            }))
                          }
                          className="grid size-8 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
                          title="Move up"
                          aria-label={`Move ${label} up`}
                        >
                          <HugeiconsIcon icon={ArrowUp01Icon} size={16} color="currentColor" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          disabled={index === order.length - 1}
                          onClick={() =>
                            setLayout((current) => ({
                              ...current,
                              homeSlotOrder: moveHomeSlot(
                                normalizeHomeSlotOrder(current.homeSlotOrder),
                                slot,
                                1
                              ),
                            }))
                          }
                          className="grid size-8 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
                          title="Move down"
                          aria-label={`Move ${label} down`}
                        >
                          <HugeiconsIcon icon={ArrowDown01Icon} size={16} color="currentColor" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-mute">
                Click <span className="font-semibold text-ink">Save home</span> to apply.
              </p>
            </section>

            {layout.cards.map((card, index) => (
              <CardEditor
                key={card.id}
                card={card}
                index={index}
                imageCount={imageCount}
                urlImageCount={urlImageCount}
                uploading={uploadingCardId === card.id}
                canRemoveCard={layout.cards.length > 1}
                onChange={(next) => updateCard(card.id, next)}
                onRemoveCard={() => removeCard(card.id)}
                onAddText={(kind) =>
                  updateCard(card.id, {
                    ...card,
                    blocks: [...card.blocks, createTextBlock(kind, '')],
                  })
                }
                onAddLinks={() =>
                  updateCard(card.id, {
                    ...card,
                    blocks: [...card.blocks, createLinksBlock()],
                  })
                }
                onAddUrlImage={(url) =>
                  updateCard(card.id, {
                    ...card,
                    blocks: [...card.blocks, createUrlImageBlock(url)],
                  })
                }
                onUploadImages={(files) => void uploadImages(card.id, files)}
                onRemoveImage={(id) => deleteImageMutation.mutate(id)}
              />
            ))}

            <button
              type="button"
              onClick={addCard}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-line bg-card px-4 py-4 text-sm font-semibold text-fog shadow-sm"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              Add another card
            </button>
          </div>

          <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-fog shadow-sm"
              >
                <HugeiconsIcon icon={ViewIcon} size={14} color="currentColor" strokeWidth={1.8} />
                View in phone
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(layout)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save home'}
              </button>
            </div>
            <div className="rounded-[2rem] border border-line bg-ink p-3 shadow-lg">
              <div className={cn('overflow-hidden rounded-[1.6rem]', visitThemeClass(layout.bgTheme || 'default'))}>
                <div className="border-b border-line/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-ink">Phone preview</p>
                  <p className="text-[11px] text-mute">Visitor Home · {layout.bgTheme || 'default'} BG</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-3 py-4">
                  <HomeElements
                    layout={previewLayout}
                    organizationName={orgName}
                    meetingBoard={previewMeetingBoard}
                    googleReview={previewGoogleReview}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-ink p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-white">View in phone</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-white/80">
                <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
            <div
              className={cn(
                'max-h-[75vh] overflow-y-auto rounded-[1.6rem] px-3 py-4',
                visitThemeClass(layout.bgTheme || 'default')
              )}
            >
              <HomeElements
                layout={previewLayout}
                organizationName={orgName}
                meetingBoard={previewMeetingBoard}
                googleReview={previewGoogleReview}
              />
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
