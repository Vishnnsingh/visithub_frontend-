import {
  Add01Icon,
  CheckListIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  LinkSquare02Icon,
  Login01Icon,
  Logout01Icon,
  Mail01Icon,
  PencilEdit02Icon,
  SmartPhone01Icon,
  StarIcon,
  TextFontIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { SelectField } from '../components/ui/Fields';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';

type CustomInputType = 'number' | 'alpha' | 'mix' | 'upload' | 'photo';
type FieldStage = 'checkin' | 'checkout';

type FieldItem = {
  key: string;
  label: string;
  type: string;
  group: 'default' | 'extra';
  showOnWebApp: boolean;
  custom?: boolean;
  stage?: FieldStage;
  required?: boolean;
};

const CUSTOM_INPUT_TYPES: { value: CustomInputType; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'alpha', label: 'Alphabetic' },
  { value: 'mix', label: 'Number + alphabet' },
  { value: 'upload', label: 'Upload' },
  { value: 'photo', label: 'Click photo' },
];

const REQUIRED_OPTIONS = [
  { value: 'optional', label: 'Optional' },
  { value: 'mandatory', label: 'Mandatory' },
];

const CHECKOUT_KEYS = new Set(['outTime', 'remarks', 'visitorSignature', 'outPhoto', 'rating']);
const AUTO_KEYS = new Set(['date', 'inTime', 'outTime', 'email']);

function newCustomKey() {
  return `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function isCustomInputType(value: string): value is CustomInputType {
  return value === 'number' || value === 'alpha' || value === 'mix' || value === 'upload' || value === 'photo';
}

function typeLabel(type: string) {
  return CUSTOM_INPUT_TYPES.find((item) => item.value === type)?.label || 'Number + alphabet';
}

function stageOf(field: FieldItem): FieldStage {
  if (field.stage === 'checkout' || field.stage === 'checkin') return field.stage;
  return CHECKOUT_KEYS.has(field.key) ? 'checkout' : 'checkin';
}

export function ActiveFields() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['visitor-fields'],
    queryFn: async () => {
      const response = await api.get('/visitor/fields');
      return response.data.data as { fields: FieldItem[]; continueWith?: { google: boolean; number: boolean } };
    },
  });
  const homeQuery = useQuery({
    queryKey: ['home-element'],
    queryFn: async () => {
      const response = await api.get('/organisation/home-element');
      return response.data.data as { meetingBoardEnabled?: boolean };
    },
  });
  const presenceQuery = useQuery({
    queryKey: ['organisation-presence'],
    queryFn: async () => {
      const response = await api.get('/organisation/presence');
      return response.data.data as {
        website: string | null;
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
      };
    },
  });
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [continueWith, setContinueWith] = useState({ google: true, number: true });
  const [editing, setEditing] = useState<FieldItem | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftRequired, setDraftRequired] = useState(false);
  const [newCheckin, setNewCheckin] = useState({ label: '', type: '', required: '' });
  const [newCheckout, setNewCheckout] = useState({ label: '', type: '', required: '' });
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewUrlDraft, setReviewUrlDraft] = useState('');

  useEffect(() => {
    if (!data?.fields) return;
    setFields(data.fields.map((field) => ({ ...field, stage: stageOf(field) })));
    setContinueWith({
      google: data.continueWith?.google !== false,
      number: data.continueWith?.number !== false,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const checkin = fields.filter((field) => stageOf(field) === 'checkin');
      const checkout = fields.filter((field) => stageOf(field) === 'checkout');
      await api.put('/visitor/fields', {
        fields: [...checkin, ...checkout].map((field) => ({
          key: field.key,
          label: field.label,
          showOnWebApp: field.showOnWebApp,
          type: field.type,
          custom: Boolean(field.custom),
          stage: stageOf(field),
          required: Boolean(field.required),
        })),
        continueWith,
      });
    },
    onSuccess: () => {
      toast.success('Active fields saved');
      queryClient.invalidateQueries({ queryKey: ['visitor-fields'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save active fields')),
  });

  const boardMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await api.put('/organisation/home-element/meeting-board', { enabled });
      return response.data.data as { meetingBoardEnabled?: boolean };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['home-element'], (prev: unknown) =>
        prev && typeof prev === 'object' ? { ...prev, meetingBoardEnabled: Boolean(next.meetingBoardEnabled) } : next
      );
      toast.success(next.meetingBoardEnabled ? 'Notice board activated' : 'Notice board turned off');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update notice board')),
  });

  const boardOn = Boolean(homeQuery.data?.meetingBoardEnabled);

  useEffect(() => {
    if (!presenceQuery.data) return;
    const url = presenceQuery.data.googleReviewUrl || '';
    if (!url) setReviewEditing(true);
    setReviewUrlDraft(url);
  }, [presenceQuery.data]);

  const reviewSaveMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await api.put('/organisation/presence/google-review', { url });
      return response.data.data as {
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
      };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['organisation-presence'], (prev: unknown) =>
        prev && typeof prev === 'object' ? { ...prev, ...next } : next
      );
      setReviewEditing(false);
      toast.success('Google Review link saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save Google Review link')),
  });

  const reviewToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await api.put('/organisation/presence/google-review', { enabled });
      return response.data.data as {
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
      };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['organisation-presence'], (prev: unknown) =>
        prev && typeof prev === 'object' ? { ...prev, ...next } : next
      );
      toast.success(next.googleReviewEnabled ? 'Google Review activated on Home' : 'Google Review turned off');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update Google Review')),
  });

  const reviewRemoveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/organisation/presence/google-review', { url: '' });
      return response.data.data as {
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
      };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['organisation-presence'], (prev: unknown) =>
        prev && typeof prev === 'object' ? { ...prev, ...next } : next
      );
      setReviewUrlDraft('');
      setReviewEditing(true);
      toast.success('Google Review link removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove Google Review link')),
  });

  const reviewSyncWebsiteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/organisation/presence/google-review', { syncFromWebsite: true });
      return response.data.data as {
        googleReviewEnabled?: boolean;
        googleReviewUrl?: string | null;
        website?: string | null;
      };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['organisation-presence'], (prev: unknown) =>
        prev && typeof prev === 'object' ? { ...prev, ...next } : next
      );
      setReviewEditing(false);
      setReviewUrlDraft(next.googleReviewUrl || '');
      toast.success('Write a review link ready from organisation website');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not use organisation website')),
  });

  const reviewUrl = presenceQuery.data?.googleReviewUrl?.trim() || '';
  const reviewOn = Boolean(presenceQuery.data?.googleReviewEnabled && reviewUrl);
  const orgWebsite = presenceQuery.data?.website?.trim() || '';

  const toggle = (key: string, showOnWebApp: boolean) => {
    setFields((current) => current.map((field) => (field.key === key ? { ...field, showOnWebApp } : field)));
  };

  const startEdit = (field: FieldItem) => {
    setEditing(field);
    setDraftLabel(field.label);
    setDraftType(isCustomInputType(field.type) ? field.type : 'mix');
    setDraftRequired(Boolean(field.required));
  };

  const saveEdit = () => {
    if (!editing) return;
    const label = draftLabel.trim();
    if (!label) {
      toast.error('Field name is required');
      return;
    }
    if (fields.some((field) => field.key !== editing.key && field.label.toLowerCase() === label.toLowerCase())) {
      toast.error('This field name already exists');
      return;
    }
    setFields((current) =>
      current.map((field) =>
        field.key === editing.key
          ? {
              ...field,
              label,
              type: field.custom && isCustomInputType(draftType) ? draftType : field.type,
              required: AUTO_KEYS.has(field.key) ? false : draftRequired,
            }
          : field
      )
    );
    setEditing(null);
  };

  const addField = (stage: FieldStage, labelValue: string, typeValue: string, requiredValue: string) => {
    const label = labelValue.trim();
    if (!label) {
      toast.error('Enter a field name');
      return;
    }
    if (fields.some((field) => field.label.toLowerCase() === label.toLowerCase())) {
      toast.error('This field name already exists');
      return;
    }
    if (!isCustomInputType(typeValue)) {
      toast.error('Choose your input type');
      return;
    }
    if (requiredValue !== 'optional' && requiredValue !== 'mandatory') {
      toast.error('Choose Optional or Mandatory');
      return;
    }
    if (fields.filter((field) => field.custom).length >= 20) {
      toast.error('You can add up to 20 extra fields');
      return;
    }
    setFields((current) => [
      ...current,
      {
        key: newCustomKey(),
        label,
        type: typeValue,
        group: 'extra',
        showOnWebApp: true,
        custom: true,
        stage,
        required: requiredValue === 'mandatory',
      },
    ]);
    if (stage === 'checkin') setNewCheckin({ label: '', type: '', required: '' });
    else setNewCheckout({ label: '', type: '', required: '' });
  };

  const removeField = (key: string) => {
    setFields((current) => current.filter((field) => field.key !== key));
    if (editing?.key === key) setEditing(null);
  };

  const moveField = (stage: FieldStage, fromKey: string, toKey: string) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setFields((current) => {
      const inStage = current.filter((field) => stageOf(field) === stage);
      const rest = current.filter((field) => stageOf(field) !== stage);
      const from = inStage.findIndex((field) => field.key === fromKey);
      const to = inStage.findIndex((field) => field.key === toKey);
      if (from < 0 || to < 0) return current;
      const next = [...inStage];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return stage === 'checkin' ? [...next, ...rest] : [...rest, ...next];
    });
  };

  const checkin = fields.filter((field) => stageOf(field) === 'checkin');
  const checkout = fields.filter((field) => stageOf(field) === 'checkout');

  return (
    <DashboardShell
      title="Active Fields"
      subtitle="Check-in fields show on the visitor form. Checkout fields show when the visitor goes out. Drag within a card, then save."
    >
      {isLoading ? (
        <p className="text-sm text-mute">Loading fields...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : (
        <form
          className="mx-auto max-w-6xl space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Home notice board · Person availability</h2>
                <p className="mt-1 text-xs text-mute">
                  When active, visitor Home shows today’s Yes / Not / Update shortly for people in Person to meet. Not
                  people also show next available from the calendar. Arrange order in Home Element.
                </p>
              </div>
              <button
                type="button"
                disabled={homeQuery.isLoading || boardMutation.isPending}
                onClick={() => boardMutation.mutate(!boardOn)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition disabled:opacity-50',
                  boardOn ? 'bg-primary' : 'bg-line'
                )}
                aria-pressed={boardOn}
                title={boardOn ? 'Turn off notice board' : 'Activate notice board'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition',
                    boardOn && 'translate-x-5'
                  )}
                />
              </button>
            </div>
            <p className={cn('mt-3 text-xs font-semibold', boardOn ? 'text-success' : 'text-mute')}>
              {boardOn ? 'Active on visitor Home' : 'Inactive — turn on to show on Home'}
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-primary">
                  <HugeiconsIcon icon={StarIcon} size={18} color="currentColor" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">Google Review</h2>
                    {reviewUrl ? (
                      <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-semibold text-fog">Added</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-mute">
                    Paste Maps share link (maps.app.goo.gl). Visitors open Write a review (stars) directly — like auto
                    clicking Google’s Write a review button. Arrange order in Home Element.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!reviewUrl || reviewToggleMutation.isPending}
                onClick={() => reviewToggleMutation.mutate(!reviewOn)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition disabled:opacity-50',
                  reviewOn ? 'bg-primary' : 'bg-line'
                )}
                aria-pressed={reviewOn}
                title={reviewOn ? 'Turn off on Home' : 'Show on Home'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition',
                    reviewOn && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            {reviewUrl && !reviewEditing ? (
              <div className="mt-4 space-y-3">
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-start gap-2 break-all text-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  <span className="mt-0.5 shrink-0">
                    <HugeiconsIcon icon={LinkSquare02Icon} size={16} color="currentColor" strokeWidth={1.8} />
                  </span>
                  {reviewUrl}
                </a>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewUrlDraft(reviewUrl);
                      setReviewEditing(true);
                    }}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fog hover:text-primary"
                  >
                    Edit link
                  </button>
                  <button
                    type="button"
                    disabled={reviewRemoveMutation.isPending}
                    onClick={() => reviewRemoveMutation.mutate()}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
                  >
                    {reviewRemoveMutation.isPending ? 'Removing...' : 'Remove'}
                  </button>
                </div>
                <p className={cn('text-xs font-semibold', reviewOn ? 'text-success' : 'text-mute')}>
                  {reviewOn ? 'Active on visitor Home' : 'Inactive — turn on to show on Home'}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <input
                  className="field-input pl-4!"
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={reviewUrlDraft}
                  onChange={(event) => setReviewUrlDraft(event.target.value)}
                />
                <p className="text-[11px] leading-relaxed text-mute">
                  Paste <span className="font-semibold text-fog">https://maps.app.goo.gl/...</span> then Add. We convert
                  it internally to Google’s Write a review page (stars dialog).
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reviewSaveMutation.isPending || !reviewUrlDraft.trim()}
                    onClick={() => reviewSaveMutation.mutate(reviewUrlDraft.trim())}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {reviewSaveMutation.isPending ? 'Saving...' : reviewUrl ? 'Update link' : 'Add Google Review link'}
                  </button>
                  <button
                    type="button"
                    disabled={!orgWebsite || reviewSyncWebsiteMutation.isPending}
                    onClick={() => reviewSyncWebsiteMutation.mutate()}
                    className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-fog hover:text-primary disabled:opacity-50"
                  >
                    {reviewSyncWebsiteMutation.isPending ? 'Using website...' : 'Use organisation website'}
                  </button>
                  {reviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewUrlDraft(reviewUrl);
                        setReviewEditing(false);
                      }}
                      className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-fog"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
                {orgWebsite ? (
                  <p className="truncate text-[11px] text-mute">Organisation website: {orgWebsite}</p>
                ) : (
                  <p className="text-[11px] text-mute">
                    No Organisation website yet — add Maps share link there or paste below.
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <FieldCard
              title="Check-in"
              hint="These fields appear when the visitor fills details."
              icon={Login01Icon}
              fields={checkin}
              draggingKey={draggingKey}
              newLabel={newCheckin.label}
              newType={newCheckin.type}
              newRequired={newCheckin.required}
              onNewLabel={(label) => setNewCheckin((current) => ({ ...current, label }))}
              onNewType={(type) => setNewCheckin((current) => ({ ...current, type }))}
              onNewRequired={(required) => setNewCheckin((current) => ({ ...current, required }))}
              onStartEdit={startEdit}
              onToggle={toggle}
              onRemove={removeField}
              onAdd={() => addField('checkin', newCheckin.label, newCheckin.type, newCheckin.required)}
              onDragStart={setDraggingKey}
              onDragEnd={() => setDraggingKey(null)}
              onDrop={(toKey) => {
                if (draggingKey) moveField('checkin', draggingKey, toKey);
                setDraggingKey(null);
              }}
            />
            <FieldCard
              title="Checkout"
              hint="These fields appear on checkout when the visitor goes out."
              icon={Logout01Icon}
              fields={checkout}
              draggingKey={draggingKey}
              newLabel={newCheckout.label}
              newType={newCheckout.type}
              newRequired={newCheckout.required}
              onNewLabel={(label) => setNewCheckout((current) => ({ ...current, label }))}
              onNewType={(type) => setNewCheckout((current) => ({ ...current, type }))}
              onNewRequired={(required) => setNewCheckout((current) => ({ ...current, required }))}
              onStartEdit={startEdit}
              onToggle={toggle}
              onRemove={removeField}
              onAdd={() => addField('checkout', newCheckout.label, newCheckout.type, newCheckout.required)}
              onDragStart={setDraggingKey}
              onDragEnd={() => setDraggingKey(null)}
              onDrop={(toKey) => {
                if (draggingKey) moveField('checkout', draggingKey, toKey);
                setDraggingKey(null);
              }}
            />
          </div>
          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Visitor continue options</h2>
            <p className="mt-1 text-xs text-mute">
              After scanning, visitors see only the options you turn on. If both are off, Enter details opens directly.
            </p>
            <div className="mt-4 divide-y divide-line">
              <ContinueToggle
                icon={Mail01Icon}
                title="Continue with Google"
                hint="Show Google sign-in on the visitor scan screen."
                on={continueWith.google}
                onToggle={() => setContinueWith((current) => ({ ...current, google: !current.google }))}
              />
              <ContinueToggle
                icon={SmartPhone01Icon}
                title="Continue with number"
                hint="Show mobile number continue on the visitor scan screen."
                on={continueWith.number}
                onToggle={() => setContinueWith((current) => ({ ...current, number: !current.number }))}
              />
            </div>
          </section>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save active fields'}
          </button>
        </form>
      )}
      {editing ? (
        <div className="fixed inset-0 z-80 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-ink">Edit field</h2>
            <p className="mt-1 text-sm text-mute">Change the name and whether visitors must fill this field.</p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-fog">Field name</span>
              <input
                className="field-input !pl-4"
                value={draftLabel}
                maxLength={80}
                autoFocus
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveEdit();
                  }
                }}
              />
            </label>
            {editing.custom ? (
              <div className="mt-4">
                <SelectField
                  label="Input type"
                  plain
                  icon={TextFontIcon}
                  value={draftType}
                  options={CUSTOM_INPUT_TYPES}
                  onChange={(event) => setDraftType(event.target.value)}
                />
              </div>
            ) : null}
            {AUTO_KEYS.has(editing.key) ? (
              <p className="mt-4 text-sm text-mute">This field is filled automatically.</p>
            ) : (
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium text-fog">Visitor must fill</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftRequired(true)}
                    className={cn(
                      'flex-1 rounded-full px-4 py-2.5 text-sm font-semibold',
                      draftRequired ? 'bg-primary text-white' : 'border border-line text-fog'
                    )}
                  >
                    Mandatory
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftRequired(false)}
                    className={cn(
                      'flex-1 rounded-full px-4 py-2.5 text-sm font-semibold',
                      !draftRequired ? 'bg-primary text-white' : 'border border-line text-fog'
                    )}
                  >
                    Optional
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border border-line py-2.5 text-sm font-semibold text-fog"
              >
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="rounded-full bg-primary py-2.5 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function ContinueToggle({
  icon,
  title,
  hint,
  on,
  onToggle,
}: {
  icon: typeof Mail01Icon;
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-bg text-ink">
        <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-mute">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition', on ? 'bg-primary' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[left]', on ? 'left-5' : 'left-0.5')} />
      </button>
    </div>
  );
}

function FieldCard({
  title,
  hint,
  icon,
  fields,
  draggingKey,
  newLabel,
  newType,
  newRequired,
  onNewLabel,
  onNewType,
  onNewRequired,
  onStartEdit,
  onToggle,
  onRemove,
  onAdd,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  title: string;
  hint: string;
  icon: typeof CheckListIcon;
  fields: FieldItem[];
  draggingKey: string | null;
  newLabel: string;
  newType: string;
  newRequired: string;
  onNewLabel: (value: string) => void;
  onNewType: (value: string) => void;
  onNewRequired: (value: string) => void;
  onStartEdit: (field: FieldItem) => void;
  onToggle: (key: string, value: boolean) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  onDragStart: (key: string) => void;
  onDragEnd: () => void;
  onDrop: (toKey: string) => void;
}) {
  return (
    <section className="h-full rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-bg text-ink">
          <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-mute">{hint}</p>
        </div>
      </div>
      <div className="divide-y divide-line">
        {fields.map((field, index) => (
          <FieldToggle
            key={field.key}
            field={field}
            order={index + 1}
            dragging={draggingKey === field.key}
            onStartEdit={() => onStartEdit(field)}
            onToggle={onToggle}
            onRemove={field.custom ? () => onRemove(field.key) : undefined}
            onDragStart={() => onDragStart(field.key)}
            onDragEnd={onDragEnd}
            onDropOn={() => onDrop(field.key)}
          />
        ))}
      </div>
      <div className="mt-3 rounded-3xl border-2 border-primary bg-primary/4 p-3">
        <p className="mb-2 text-xs font-semibold text-ink">Fill every box below, then add the field.</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field-input min-w-0 !pl-4"
            value={newLabel}
            maxLength={80}
            placeholder="New field name"
            onChange={(event) => onNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAdd();
              }
            }}
          />
          <SelectField
            label={`${title} input type`}
            hideLabel
            plain
            icon={TextFontIcon}
            placeholder="Choose your input"
            value={newType}
            options={CUSTOM_INPUT_TYPES}
            onChange={(event) => onNewType(event.target.value)}
          />
          <SelectField
            label={`${title} required`}
            hideLabel
            plain
            icon={CheckListIcon}
            placeholder="Optional or mandatory"
            value={newRequired}
            options={REQUIRED_OPTIONS}
            onChange={(event) => onNewRequired(event.target.value)}
          />
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-[3.05rem] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-deep"
          >
            <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            Add field
          </button>
        </div>
        <p className="mt-2 text-xs text-mute">Number, Alphabetic, Number + alphabet, Upload, or Click photo. Max 5 MB.</p>
      </div>
    </section>
  );
}

function FieldToggle({
  field,
  order,
  dragging,
  onStartEdit,
  onToggle,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  field: FieldItem;
  order: number;
  dragging: boolean;
  onStartEdit: () => void;
  onToggle: (key: string, value: boolean) => void;
  onRemove?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', field.key);
        onDragStart();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropOn();
      }}
      onDragEnd={onDragEnd}
      className={cn('flex items-center gap-3 py-3 cursor-grab active:cursor-grabbing', dragging && 'opacity-40')}
    >
      <span className="grid size-8 shrink-0 place-items-center text-mute" aria-hidden>
        <HugeiconsIcon icon={DragDropVerticalIcon} size={16} color="currentColor" strokeWidth={1.8} />
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-ink">
        {order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{field.label}</p>
            <p className="text-xs text-mute">
              {AUTO_KEYS.has(field.key) ? 'Automatic' : field.required ? 'Mandatory' : 'Optional'}
              {field.custom ? ` · ${typeLabel(isCustomInputType(field.type) ? field.type : 'mix')}` : ''}
              {' · Show on web app'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            onPointerDown={(event) => event.stopPropagation()}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-mute hover:text-primary"
            aria-label={`Edit ${field.label}`}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={14} color="currentColor" strokeWidth={1.8} />
          </button>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              onPointerDown={(event) => event.stopPropagation()}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-mute hover:text-danger"
              aria-label={`Remove ${field.label}`}
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={field.showOnWebApp}
        onClick={() => onToggle(field.key, !field.showOnWebApp)}
        onPointerDown={(event) => event.stopPropagation()}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition', field.showOnWebApp ? 'bg-primary' : 'bg-line')}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[left]',
            field.showOnWebApp ? 'left-5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}
