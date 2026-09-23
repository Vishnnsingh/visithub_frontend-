import {
  Calendar03Icon,
  Clock01Icon,
  Delete02Icon,
  Globe02Icon,
  Image01Icon,
  Building03Icon,
  LinkSquare02Icon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { SelectField } from '../components/ui/Fields';
import { api, getApiErrorMessage, publicUploadUrl } from '../lib/api';
import { compressImage } from '../lib/compressImage';
import { cn } from '../lib/cn';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const LOGO_MIN_SIDE = 180;
const LOGO_MAX_SIDE = 1024;

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    image.src = url;
  });
}

async function validateLogoFile(file: File) {
  if (!LOGO_TYPES.has(file.type)) {
    throw new Error('Use PNG, JPG or WEBP');
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error('Logo must be 5 MB or smaller');
  }
  const { width, height } = await readImageSize(file);
  if (width !== height) {
    throw new Error('Use a square logo like an app icon (512 × 512 recommended)');
  }
  if (width < LOGO_MIN_SIDE) {
    throw new Error('Logo should be at least 180 × 180 pixels');
  }
  if (width > LOGO_MAX_SIDE) {
    throw new Error('Logo should be at most 1024 × 1024 pixels');
  }
  return { width, height };
}

function AppIcon({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div
      className="org-app-icon grid shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-line bg-bg text-mute shadow-[0_8px_20px_rgba(17,24,39,0.08)]"
      style={{ width: 96, height: 96, minWidth: 96, minHeight: 96, maxWidth: 96, maxHeight: 96 }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={96}
          height={96}
          className="block"
          style={{ width: 96, height: 96, maxWidth: 96, maxHeight: 96, objectFit: 'cover' }}
        />
      ) : (
        <HugeiconsIcon icon={Image01Icon} size={28} color="currentColor" strokeWidth={1.8} />
      )}
    </div>
  );
}

function WeekStrip({ selected, onToggle }: { selected: string[]; onToggle?: (day: string) => void }) {
  return (
    <div className="flex w-full gap-2">
      {WEEK_DAYS.map((day) => {
        const active = selected.includes(day);
        const className = cn(
          'flex h-11 w-0 min-w-0 flex-1 items-center justify-center rounded-2xl text-xs font-semibold',
          active ? 'bg-primary text-white' : 'border border-line bg-bg text-fog'
        );
        if (!onToggle) {
          return (
            <span key={day} className={className}>
              {day.slice(0, 3)}
            </span>
          );
        }
        return (
          <button key={day} type="button" onClick={() => onToggle(day)} className={className}>
            {day.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

type Presence = {
  logoFile: string | null;
  welcomeImageFile: string | null;
  website: string | null;
  workingDays: string[] | null;
  openingTime: string | null;
  closingTime: string | null;
  googleReviewEnabled?: boolean;
};

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value, label: formatTime(value) };
});

export function Organisation() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['organisation-presence'],
    queryFn: async () => {
      const response = await api.get('/organisation/presence');
      return response.data.data as Presence;
    },
  });

  const presence = data || {
    logoFile: null,
    welcomeImageFile: null,
    website: null,
    workingDays: null,
    openingTime: null,
    closingTime: null,
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['organisation-presence'] });

  return (
    <DashboardShell
      title="Organisation"
      subtitle="Public identity and working hours for your location."
    >
      {isLoading ? (
        <p className="text-sm text-mute">Loading organisation details...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-4 pb-16 sm:grid-cols-2">
          <LogoCard value={presence.logoFile} onChanged={invalidate} />
          <WebsiteCard value={presence.website} onChanged={invalidate} />
          <div className="sm:col-span-2">
            <WelcomeImageCard value={presence.welcomeImageFile} onChanged={invalidate} />
          </div>
          <div className="sm:col-span-2">
            <WorkingDaysCard value={presence.workingDays} onChanged={invalidate} />
          </div>
          <TimeCard
            title="Opening time"
            emptyHint="When your location opens."
            value={presence.openingTime}
            path="opening-time"
            onChanged={invalidate}
          />
          <TimeCard
            title="Closing time"
            emptyHint="When your location closes."
            value={presence.closingTime}
            path="closing-time"
            onChanged={invalidate}
          />
        </div>
      )}
    </DashboardShell>
  );
}

function PresenceCard({
  title,
  icon,
  set,
  children,
}: {
  title: string;
  icon: IconSvgElement;
  set?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="flex h-full min-h-[220px] flex-col overflow-visible rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-bg text-ink">
            <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
          </span>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            set ? 'bg-primary/8 text-ink' : 'bg-bg text-mute'
          )}
        >
          {set ? 'Added' : 'Not set'}
        </span>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </article>
  );
}

function ActionRow({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="mt-auto flex gap-2 pt-4">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog hover:text-primary"
      >
        <HugeiconsIcon icon={PencilEdit02Icon} size={14} color="currentColor" strokeWidth={1.8} />
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-bg disabled:opacity-50"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
        Delete
      </button>
    </div>
  );
}

function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-auto w-fit self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
    >
      {pending ? 'Saving...' : label}
    </button>
  );
}

function LogoCard({ value, onChanged }: { value: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(!value);
  const [file, setFile] = useState<File | null>(null);
  const [fileHint, setFileHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = file ? URL.createObjectURL(file) : null;
  const preview = objectUrl || publicUploadUrl(value);
  const logoUrl = publicUploadUrl(value);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const chooseFile = async (next: File | null) => {
    if (!next) {
      setFile(null);
      setFileHint('');
      return;
    }
    try {
      const size = await validateLogoFile(next);
      setFile(next);
      setFileHint(`${size.width} × ${size.height} · ${(next.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err) {
      setFile(null);
      setFileHint('');
      if (inputRef.current) inputRef.current.value = '';
      toast.error(getApiErrorMessage(err, 'This image cannot be used as a logo'));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a logo image');
      const form = new FormData();
      form.append('logo', file);
      await api.put('/organisation/presence/logo', form);
    },
    onSuccess: () => {
      toast.success('Logo saved');
      setFile(null);
      setFileHint('');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save logo')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete('/organisation/presence/logo'),
    onSuccess: () => {
      toast.success('Logo removed');
      setFile(null);
      setFileHint('');
      setEditing(true);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove logo')),
  });

  return (
    <PresenceCard title="Logo" icon={Image01Icon} set={Boolean(value)}>
      {editing || !value ? (
        <form
          className="flex flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void chooseFile(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex max-w-full items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-line bg-bg px-4 py-3 text-left text-mute hover:border-primary/40"
          >
            <AppIcon src={preview} alt="Organisation logo preview" />
            <span>
              <span className="block text-sm font-semibold text-ink">
                {file?.name || (value ? 'Replace logo' : 'Upload logo')}
              </span>
              <span className="mt-1 block text-xs leading-5 text-mute">
                Square app icon · PNG, JPG or WEBP
                <br />
                512 × 512 recommended · max 5 MB
              </span>
              {fileHint ? <span className="mt-1 block text-xs font-medium text-ink">{fileHint}</span> : null}
            </span>
          </button>
          <SaveButton
            pending={saveMutation.isPending}
            label={value ? 'Update logo' : 'Add logo'}
          />
        </form>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <AppIcon src={preview} alt="Organisation logo" />
            {logoUrl ? (
              <a
                href={logoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <HugeiconsIcon icon={LinkSquare02Icon} size={14} color="currentColor" strokeWidth={1.8} />
                Open logo
              </a>
            ) : null}
          </div>
          <ActionRow onEdit={() => setEditing(true)} onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
        </>
      )}
    </PresenceCard>
  );
}

async function validateWelcomeFile(file: File) {
  if (!LOGO_TYPES.has(file.type)) {
    throw new Error('Use PNG, JPG or WEBP');
  }
  const { width, height } = await readImageSize(file);
  if (width < 320 || height < 180) {
    throw new Error('Use a wider photo, at least 320 × 180 pixels');
  }
  let next = file;
  if (file.size > LOGO_MAX_BYTES || Math.max(width, height) > 1920) {
    next = await compressImage(file, `welcome-${Date.now()}.jpg`, 1920);
  }
  if (next.size > LOGO_MAX_BYTES) {
    throw new Error('Welcome image must be 5 MB or smaller');
  }
  const size = next === file ? { width, height } : await readImageSize(next);
  return { file: next, width: size.width, height: size.height };
}

function WelcomeImageCard({ value, onChanged }: { value: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(!value);
  const [file, setFile] = useState<File | null>(null);
  const [fileHint, setFileHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = file ? URL.createObjectURL(file) : null;
  const preview = objectUrl || publicUploadUrl(value);
  const imageUrl = publicUploadUrl(value);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const chooseFile = async (next: File | null) => {
    if (!next) {
      setFile(null);
      setFileHint('');
      return;
    }
    try {
      const size = await validateWelcomeFile(next);
      setFile(size.file);
      setFileHint(`${size.width} × ${size.height} · ${(size.file.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err) {
      setFile(null);
      setFileHint('');
      if (inputRef.current) inputRef.current.value = '';
      toast.error(getApiErrorMessage(err, 'This image cannot be used'));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a welcome image');
      const form = new FormData();
      form.append('welcomeImage', file);
      await api.put('/organisation/presence/welcome-image', form);
    },
    onSuccess: () => {
      toast.success('Welcome image saved');
      setFile(null);
      setFileHint('');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save welcome image')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete('/organisation/presence/welcome-image'),
    onSuccess: () => {
      toast.success('Welcome image removed');
      setFile(null);
      setFileHint('');
      setEditing(true);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove welcome image')),
  });

  return (
    <PresenceCard title="Welcome image" icon={Building03Icon} set={Boolean(value)}>
      {editing || !value ? (
        <form
          className="flex flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void chooseFile(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="overflow-hidden rounded-2xl border border-dashed border-line bg-bg text-left text-mute hover:border-primary/40"
          >
            {preview ? (
              <img src={preview} alt="Welcome preview" className="max-h-44 w-full object-cover" />
            ) : (
              <span className="grid h-32 place-items-center">
                <HugeiconsIcon icon={Building03Icon} size={28} color="currentColor" strokeWidth={1.8} />
              </span>
            )}
            <span className="block px-4 py-3">
              <span className="block text-sm font-semibold text-ink">
                {file?.name || (value ? 'Replace welcome image' : 'Upload welcome image')}
              </span>
              <span className="mt-1 block text-xs leading-5 text-mute">
                Building or campus photo for the visitor first page
                <br />
                PNG, JPG or WEBP · max 5 MB · size follows your image
              </span>
              {fileHint ? <span className="mt-1 block text-xs font-medium text-ink">{fileHint}</span> : null}
            </span>
          </button>
          <SaveButton pending={saveMutation.isPending} label={value ? 'Update image' : 'Add image'} />
        </form>
      ) : (
        <>
          {imageUrl ? <img src={imageUrl} alt="Welcome" className="max-h-44 w-full rounded-2xl object-cover" /> : null}
          <ActionRow onEdit={() => setEditing(true)} onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
        </>
      )}
    </PresenceCard>
  );
}

function WebsiteCard({ value, onChanged }: { value: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(!value);
  const [website, setWebsite] = useState(value || '');

  const saveMutation = useMutation({
    mutationFn: async () => api.put('/organisation/presence/website', { website }),
    onSuccess: () => {
      toast.success('Website saved');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save website')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete('/organisation/presence/website'),
    onSuccess: () => {
      toast.success('Website removed');
      setWebsite('');
      setEditing(true);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove website')),
  });

  return (
    <PresenceCard title="Website" icon={Globe02Icon} set={Boolean(value)}>
      {value && !editing ? (
        <>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-start gap-2 break-all text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            <span className="mt-0.5 shrink-0">
              <HugeiconsIcon icon={LinkSquare02Icon} size={16} color="currentColor" strokeWidth={1.8} />
            </span>
            {value}
          </a>
          <ActionRow
            onEdit={() => {
              setWebsite(value);
              setEditing(true);
            }}
            onDelete={() => deleteMutation.mutate()}
            deleting={deleteMutation.isPending}
          />
        </>
      ) : (
        <form
          className="flex flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <p className="text-sm text-mute">Public site visitors can open in one click.</p>
          <input
            className="field-input !pl-4"
            type="url"
            placeholder="https://www.yourorganisation.in"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <SaveButton
            pending={saveMutation.isPending}
            label={value ? 'Update website' : 'Add website'}
          />
        </form>
      )}
    </PresenceCard>
  );
}

function WorkingDaysCard({ value, onChanged }: { value: string[] | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(!value?.length);
  const [days, setDays] = useState<string[]>(value || []);

  const toggle = (day: string) => {
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const saveMutation = useMutation({
    mutationFn: async () => api.put('/organisation/presence/working-days', { days }),
    onSuccess: () => {
      toast.success('Working days saved');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save working days')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete('/organisation/presence/working-days'),
    onSuccess: () => {
      toast.success('Working days removed');
      setDays([]);
      setEditing(true);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove working days')),
  });

  return (
    <PresenceCard title="Working days" icon={Calendar03Icon} set={Boolean(value?.length)}>
      {value?.length && !editing ? (
        <>
          <WeekStrip selected={value} />
          <ActionRow
            onEdit={() => {
              setDays(value);
              setEditing(true);
            }}
            onDelete={() => deleteMutation.mutate()}
            deleting={deleteMutation.isPending}
          />
        </>
      ) : (
        <form
          className="flex flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <p className="text-sm text-mute">Select the days your organisation is open.</p>
          <WeekStrip selected={days} onToggle={toggle} />
          <SaveButton
            pending={saveMutation.isPending}
            label={value?.length ? 'Update days' : 'Add working days'}
          />
        </form>
      )}
    </PresenceCard>
  );
}

function TimeCard({
  title,
  emptyHint,
  value,
  path,
  onChanged,
}: {
  title: string;
  emptyHint: string;
  value: string | null;
  path: 'opening-time' | 'closing-time';
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(!value);
  const [time, setTime] = useState(value || '');

  const saveMutation = useMutation({
    mutationFn: async () => api.put(`/organisation/presence/${path}`, { time }),
    onSuccess: () => {
      toast.success(`${title} saved`);
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, `Could not save ${title.toLowerCase()}`)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/organisation/presence/${path}`),
    onSuccess: () => {
      toast.success(`${title} removed`);
      setTime('');
      setEditing(true);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, `Could not remove ${title.toLowerCase()}`)),
  });

  return (
    <PresenceCard title={title} icon={Clock01Icon} set={Boolean(value)}>
      {value && !editing ? (
        <>
          <p className="text-3xl font-semibold tracking-tight text-ink">{formatTime(value)}</p>
          <ActionRow
            onEdit={() => {
              setTime(value);
              setEditing(true);
            }}
            onDelete={() => deleteMutation.mutate()}
            deleting={deleteMutation.isPending}
          />
        </>
      ) : (
        <form
          className="flex flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!time) {
              toast.error('Select a time');
              return;
            }
            saveMutation.mutate();
          }}
        >
          <p className="text-sm text-mute">{emptyHint}</p>
          <SelectField
            label="Time"
            icon={Clock01Icon}
            placeholder="Select time"
            options={
              time && !TIME_OPTIONS.some((option) => option.value === time)
                ? [...TIME_OPTIONS, { value: time, label: formatTime(time) }]
                : TIME_OPTIONS
            }
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          <SaveButton
            pending={saveMutation.isPending}
            label={value ? `Update ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
          />
        </form>
      )}
    </PresenceCard>
  );
}
