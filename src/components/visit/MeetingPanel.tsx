import { ArrowRight01Icon, CheckmarkCircle02Icon, Comment01Icon, QrCode01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SelectField } from '../ui/Fields';
import { api, getApiErrorMessage, publicUploadUrl } from '../../lib/api';
import { cn } from '../../lib/cn';
import { CenteredOverlay } from './CenteredOverlay';
import { PhotoField } from './PhotoField';
import { SignaturePad } from './SignaturePad';

type Gate = { label: string; publicCode: string };

type Visitor = {
  id: string;
  visitorUid?: string;
  ticketId?: string;
  personToMeet: string | null;
  outTime: string | null;
  outLabel?: string | null;
  rating?: number | null;
  ticketStatus?: string | null;
  declined?: boolean;
  closedAt?: string | null;
  date?: string | null;
  inTime?: string | null;
  createdAt?: string;
  waitEndsAt?: string | null;
  waitMinutes?: number | null;
  waitStartedAt?: string | null;
  waitSource?: 'default' | 'manual' | null;
};

type CheckoutField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  custom?: boolean;
};

type Meeting = {
  personName: string;
  availability: 'yes' | 'no' | null;
  label: string;
  waitEndsAt?: string | null;
  waitMinutes?: number | null;
  remainingMs?: number;
  waitSource?: 'default' | 'manual' | null;
  nextAvailableDate?: string | null;
  nextAvailableInDays?: number | null;
  checkoutReady?: boolean;
  remarksEnabled?: boolean;
  signatureEnabled?: boolean;
  outPhotoEnabled?: boolean;
  remarksLabel?: string;
  signatureLabel?: string;
  outPhotoLabel?: string;
  ratingEnabled?: boolean;
  ratingLabel?: string;
  remarksRequired?: boolean;
  signatureRequired?: boolean;
  outPhotoRequired?: boolean;
  checkoutFields?: CheckoutField[];
};

export function MeetingPanel({
  code,
  visit,
  visitor,
  onClosed,
  onVisitComplete,
}: {
  code: string;
  visit: {
    organizationName?: string;
    organizationLogo?: string | null;
    organizationWelcomeImage?: string | null;
    label: string;
    publicCode: string;
    gates?: Gate[];
    meeting?: Meeting;
    defaultWaitMinutes?: number | null;
  };
  visitor?: Visitor;
  onClosed?: () => void;
  /** After rating (or checkout when rating is off) → bare Home for Google review */
  onVisitComplete?: () => void;
}) {
  const meeting = visit.meeting;
  const name = meeting?.personName || visitor?.personToMeet;
  const ticketId = visitor?.ticketId || visitor?.visitorUid;
  const waitEndsAt = waitEndIso(meeting, visitor, visit.defaultWaitMinutes);
  const [now, setNow] = useState(Date.now());
  const [remarks, setRemarks] = useState('');
  const [signature, setSignature] = useState<File | null>(null);
  const [outPhoto, setOutPhoto] = useState<File | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [customFiles, setCustomFiles] = useState<Record<string, File | null>>({});
  const [outGate, setOutGate] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const queryClient = useQueryClient();
  const gates = visit.gates?.length ? visit.gates : [{ label: visit.label, publicCode: visit.publicCode }];

  useEffect(() => {
    if (!waitEndsAt || visitor?.outTime) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [waitEndsAt, visitor?.outTime]);

  useEffect(() => {
    if (visitor?.rating) setStars(visitor.rating);
  }, [visitor?.rating]);

  useEffect(() => {
    if (meeting?.availability === 'no') {
      setOutGate('');
      return;
    }
    setOutGate((current) => current || visit.publicCode || '');
  }, [meeting?.availability, visit.publicCode]);

  const remaining = waitEndsAt ? Math.max(0, new Date(waitEndsAt).getTime() - now) : 0;
  const showWaitTimer = Boolean(visitor && !visitor.outTime && waitEndsAt && meeting?.availability !== 'no');
  const contactSoon = Boolean(showWaitTimer && (meeting?.availability === 'yes' || meeting?.availability == null));
  const extraCheckout = (meeting?.checkoutFields || []).filter((field) => field.custom);
  const canCheckout = Boolean(visitor && !visitor.outTime);
  const ratingEnabled = Boolean(meeting?.ratingEnabled);
  const ratingSaved = Boolean(visitor?.rating);
  const showRating = Boolean(visitor?.outTime && ratingEnabled);
  const heroImage = publicUploadUrl(visit.organizationWelcomeImage) || publicUploadUrl(visit.organizationLogo);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!visitor) throw new Error('Visitor details not found');
      const form = new FormData();
      form.append('outPublicCode', outGate);
      if (meeting?.remarksEnabled) form.append('remarks', remarks);
      if (signature) form.append('signature', signature);
      if (outPhoto) form.append('outPhoto', outPhoto);
      for (const field of extraCheckout) {
        if (field.type === 'photo' || field.type === 'upload') {
          const file = customFiles[field.key];
          if (file) form.append(field.key, file);
        } else {
          form.append(field.key, customValues[field.key] || '');
        }
      }
      const response = await api.post(`/qr/visit/${code}/meeting-out/${visitor.id}`, form);
      return response.data.data.visitor as Visitor;
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setSuccessOpen(true);
      onClosed?.();
      void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitor?.id] });
      void queryClient.invalidateQueries({ queryKey: ['qr-visit-history', code, visitor?.id] });
      if (!meeting?.ratingEnabled) {
        window.setTimeout(() => {
          setSuccessOpen(false);
          onVisitComplete?.();
        }, 1600);
      } else {
        window.setTimeout(() => setSuccessOpen(false), 1600);
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not submit out details')),
  });

  const ratingMutation = useMutation({
    mutationFn: async () => {
      if (!visitor) throw new Error('Visitor details not found');
      const response = await api.post(`/qr/visit/${code}/rating/${visitor.id}`, { rating: stars });
      return response.data.data.visitor as Visitor;
    },
    onSuccess: () => {
      toast.success('Rating saved');
      void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitor?.id] });
      onVisitComplete?.();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save rating')),
  });

  const completedRef = useRef(false);
  useEffect(() => {
    if (!visitor?.outTime || completedRef.current) return;
    // Reopen after rating already saved — go Home; live checkout uses mutation callbacks
    if (!ratingEnabled || !visitor.rating) return;
    completedRef.current = true;
    onVisitComplete?.();
  }, [visitor?.outTime, visitor?.rating, ratingEnabled, onVisitComplete]);

  if (!visitor) {
    return <Placeholder title="Meeting" text="Fill your details to see the meeting person." />;
  }
  if (!name && !visitor.outTime && visitor.ticketStatus !== 'closed') {
    return <Placeholder title="Meeting" text="No meeting person was added for this visit." />;
  }

  const closed = Boolean(visitor.outTime);
  const unavailable = Boolean(!closed && (visitor.declined || meeting?.availability === 'no'));
  const tone =
    meeting?.availability === 'yes' ? 'text-success' : unavailable ? 'text-ink' : 'text-mute';

  if (closed) {
    return (
      <div className="-mx-4 -mt-4 pb-2">
        <div className="relative h-64 overflow-hidden bg-primary">
          {heroImage ? (
            <img src={heroImage} alt={visit.organizationName || 'Organisation'} className="h-full w-full object-cover object-center" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-primary to-primary-deep" />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-white/25 via-transparent to-card" />
        </div>

        <div className="relative z-10 -mt-16 space-y-3 px-4">
          <div className="rounded-[1.75rem] border border-line bg-card px-5 py-8 text-center shadow-[0_16px_40px_rgba(17,24,39,0.08)]">
            <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(17,24,39,0.18)]">
              <span className="absolute -top-1 right-1 size-1.5 rounded-full bg-white" />
              <span className="absolute top-1.5 -right-1 size-1 rounded-full bg-white/80" />
              <span className="absolute -bottom-0.5 left-2 size-1 rounded-full bg-white/70" />
              <span className="absolute bottom-3 -left-1 size-1.5 rounded-full bg-white/90" />
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={30} color="currentColor" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-mute uppercase">Visit complete</p>
            <h2 className="mt-2 text-[1.65rem] leading-tight font-semibold tracking-tight text-ink">Thank you for visiting</h2>
            {visit.organizationName ? (
              <p className="mt-1 text-lg font-semibold text-primary">{visit.organizationName}</p>
            ) : null}
            <span className="mx-auto mt-3 block h-0.5 w-8 rounded-full bg-primary" />
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-mute">
              We appreciate your time and hope to welcome you again.
            </p>
          </div>

          {showRating ? (
            <RatingCard
              label={meeting?.ratingLabel}
              stars={stars}
              setStars={setStars}
              pending={ratingMutation.isPending}
              locked={ratingSaved}
              onSubmit={() => ratingMutation.mutate()}
            />
          ) : null}

          <div className="flex items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3.5 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-primary">
              <HugeiconsIcon icon={Comment01Icon} size={18} color="currentColor" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Your feedback helps us improve</p>
              <p className="mt-0.5 text-xs leading-relaxed text-mute">Together we build a better and safer campus.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-card px-5 py-10 text-center shadow-[0_12px_30px_rgba(15,39,68,0.06)]">
        {ticketId ? (
          <p className="absolute top-4 left-4 text-left text-[11px] font-semibold tracking-wide text-mute">
            Ticket ID
            <span className="mt-0.5 block font-medium text-ink">{ticketId}</span>
          </p>
        ) : null}
        <p className="text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">Meeting person</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{name}</h2>
        <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-primary" />
        <p className="mt-6 text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">Available</p>
        {unavailable ? (
          <>
            <p className={cn('mt-2 text-xl font-semibold', tone)}>Not</p>
            {meeting?.nextAvailableInDays != null && meeting.nextAvailableDate ? (
              <div className="mt-4 space-y-1">
                <p className="text-sm font-semibold text-ink">Not available today</p>
                <p className="text-xs text-mute">
                  Next available: {formatNextAvailableDate(meeting.nextAvailableDate)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-mute">Not available today</p>
            )}
          </>
        ) : (
          <p className={cn('mt-2 text-xl font-semibold', tone)}>{meeting?.label || 'Update shortly'}</p>
        )}
        {showWaitTimer && !unavailable ? (
          <>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{formatCountdown(remaining)}</p>
            {remaining <= 0 ? <p className="mt-1 text-sm font-semibold text-mute">Time over</p> : null}
            {contactSoon ? <p className="mt-2 text-sm font-medium text-mute">We contact you soon</p> : null}
          </>
        ) : null}
      </div>

      {canCheckout ? (
        <form
          className="rounded-[1.75rem] border border-line bg-card p-5 shadow-[0_12px_30px_rgba(15,39,68,0.06)]"
          onSubmit={(event) => {
            event.preventDefault();
            for (const field of extraCheckout) {
              if (!field.required) continue;
              if ((field.type === 'photo' || field.type === 'upload') && !customFiles[field.key]) {
                toast.error(`${field.label} is required`);
                return;
              }
              if (field.type !== 'photo' && field.type !== 'upload' && !customValues[field.key]?.trim()) {
                toast.error(`${field.label} is required`);
                return;
              }
            }
            if (meeting?.remarksRequired && !remarks.trim()) {
              toast.error(`${meeting.remarksLabel || 'Remarks'} is required`);
              return;
            }
            if (meeting?.signatureRequired && !signature) {
              toast.error(`${meeting.signatureLabel || 'Visitor signature'} is required`);
              return;
            }
            if (meeting?.outPhotoRequired && !outPhoto) {
              toast.error(`${meeting.outPhotoLabel || 'Out gate photo'} is required`);
              return;
            }
            if (!outGate) {
              toast.error('Select the gate number');
              return;
            }
            setConfirmOpen(true);
          }}
        >
          <p className="mb-1 text-base font-bold tracking-tight text-ink">Checkout</p>
          <p className="mb-4 text-sm text-mute">Choose your out gate and submit when you leave.</p>
          {meeting?.remarksEnabled ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fog">
                {meeting.remarksLabel || 'Remarks'}
                {meeting.remarksRequired ? <span className="text-danger"> *</span> : <span className="ml-1 text-xs font-normal text-mute">Optional</span>}
              </span>
              <textarea
                className="field-input min-h-28 !pl-4"
                value={remarks}
                required={meeting.remarksRequired}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Type remarks"
              />
            </label>
          ) : null}

          {meeting?.signatureEnabled ? (
            <div className={meeting.remarksEnabled ? 'mt-4' : ''}>
              <p className="mb-1.5 text-sm font-medium text-fog">
                {meeting.signatureLabel || 'Visitor signature'}
                {meeting.signatureRequired ? <span className="text-danger"> *</span> : <span className="ml-1 text-xs font-normal text-mute">Optional</span>}
              </p>
              <SignaturePad value={signature} onChange={setSignature} className="h-56" />
            </div>
          ) : null}

          <div className={cn((meeting?.remarksEnabled || meeting?.signatureEnabled) && 'mt-4')}>
            <SelectField
              label="Out from gate"
              icon={QrCode01Icon}
              plain
              value={outGate}
              placeholder="Select gate number"
              options={gates.map((gate) => ({ value: gate.publicCode, label: gate.label }))}
              onChange={(event) => setOutGate(event.target.value)}
            />
          </div>

          {meeting?.outPhotoEnabled ? (
            <div className="mt-4">
              <PhotoField
                label={meeting.outPhotoLabel || 'Out gate photo'}
                value={outPhoto}
                onChange={setOutPhoto}
                required={meeting.outPhotoRequired}
                mode="photo"
              />
            </div>
          ) : null}

          {extraCheckout.map((field) => (
            <div key={field.key} className="mt-4">
              {field.type === 'photo' || field.type === 'upload' ? (
                <PhotoField
                  label={field.label}
                  value={customFiles[field.key] || null}
                  required={field.required}
                  mode={field.type === 'upload' ? 'upload' : 'photo'}
                  onChange={(file) => setCustomFiles((current) => ({ ...current, [field.key]: file }))}
                />
              ) : field.type === 'textarea' ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                  </span>
                  <textarea
                    className="field-input min-h-24 !pl-4"
                    value={customValues[field.key] || ''}
                    required={field.required}
                    onChange={(event) => setCustomValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                  </span>
                  <input
                    className="field-input !pl-4"
                    value={customValues[field.key] || ''}
                    required={field.required}
                    inputMode={field.type === 'number' ? 'numeric' : undefined}
                    placeholder={
                      field.type === 'number'
                        ? 'Numbers only'
                        : field.type === 'alpha'
                          ? 'Letters only'
                          : field.type === 'mix'
                            ? 'Numbers + alphabet'
                            : undefined
                    }
                    onChange={(event) => {
                      const next =
                        field.type === 'number'
                          ? event.target.value.replace(/\D/g, '')
                          : field.type === 'alpha'
                            ? event.target.value.replace(/[^A-Za-z\s]/g, '')
                            : field.type === 'mix'
                              ? event.target.value.replace(/[^A-Za-z0-9\s]/g, '')
                              : event.target.value;
                      setCustomValues((current) => ({ ...current, [field.key]: next }));
                    }}
                  />
                </label>
              )}
            </div>
          ))}

          <div className="mt-5 rounded-[1.4rem] bg-[#f4fbf8] p-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] transition hover:shadow-[0_12px_32px_rgba(15,39,68,0.12)] active:scale-[0.99]"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary text-white">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color="currentColor" strokeWidth={2} />
              </span>
              Submit checkout
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
            </button>
          </div>
        </form>
      ) : null}

      {confirmOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-[1.75rem] bg-card px-6 py-7 text-center shadow-[0_16px_40px_rgba(15,39,68,0.12)]">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e7f7f1] text-primary">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color="currentColor" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">Submit meeting out?</p>
            <p className="mt-1 text-sm text-mute">Out time and gate will be saved.</p>
            <div className="mt-5 space-y-2">
              <div className="rounded-[1.4rem] bg-[#f4fbf8] p-2">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] disabled:opacity-60"
                >
                  {mutation.isPending ? 'Saving...' : 'Yes, submit'}
                  {!mutation.isPending ? (
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
                  ) : null}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="w-full rounded-full py-2.5 text-sm font-semibold text-mute"
              >
                Cancel
              </button>
            </div>
          </div>
        </CenteredOverlay>
      ) : null}

      {successOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card px-6 py-8 text-center shadow-lg">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={26} color="currentColor" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">Filled successfully</p>
            <p className="mt-1 text-sm text-mute">Out time and gate are saved.</p>
          </div>
        </CenteredOverlay>
      ) : null}
    </div>
  );
}

function RatingCard({
  label,
  stars,
  setStars,
  pending,
  locked,
  onSubmit,
}: {
  label?: string;
  stars: number;
  setStars: (value: number) => void;
  pending: boolean;
  locked?: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-bg text-primary">
          <HugeiconsIcon icon={StarIcon} size={18} color="currentColor" strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{label || 'Meeting rating'}</p>
          <p className="text-xs text-mute">Rate this meeting from 1 to 5.</p>
        </div>
      </div>
      <div className="mt-4 flex justify-between gap-1">
        {STAR_LABELS.map((caption, index) => {
          const value = index + 1;
          const active = stars >= value;
          return (
            <button
              key={value}
              type="button"
              disabled={locked}
              aria-label={`${caption}, ${value} out of 5`}
              onClick={() => setStars(value)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 disabled:opacity-80"
            >
              <HugeiconsIcon
                icon={StarIcon}
                size={30}
                color="currentColor"
                strokeWidth={1.6}
                fill={active ? 'currentColor' : 'none'}
                className={active ? 'text-primary' : 'text-mute'}
              />
              <span className={cn('text-[10px] leading-tight font-medium', active ? 'text-ink' : 'text-mute')}>
                {caption}
              </span>
            </button>
          );
        })}
      </div>
      {locked ? (
        <p className="mt-4 rounded-full bg-bg py-3 text-center text-sm font-semibold text-fog">Thanks for your rating</p>
      ) : (
        <div className="mt-5 rounded-[1.4rem] bg-[#f4fbf8] p-2">
          <button
            type="button"
            disabled={!stars || pending}
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] disabled:opacity-60"
          >
            {pending ? 'Saving...' : 'Submit rating'}
            {!pending ? <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} /> : null}
          </button>
        </div>
      )}
    </div>
  );
}

const STAR_LABELS = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];

function waitEndIso(
  meeting: Meeting | undefined,
  visitor: Visitor | undefined,
  _defaultWaitMinutes?: number | null
) {
  const iso = meeting?.waitEndsAt || visitor?.waitEndsAt;
  if (iso && !Number.isNaN(new Date(iso).getTime())) return iso;
  // Only show counter after wait actually started (post-selfie) — do not invent from createdAt
  const minutes = meeting?.waitMinutes || visitor?.waitMinutes || 0;
  const started = visitor?.waitStartedAt;
  if (!minutes || !started || meeting?.availability === 'no') return null;
  const fromStart = new Date(started).getTime() + minutes * 60 * 1000;
  if (!Number.isNaN(fromStart)) return new Date(fromStart).toISOString();
  return null;
}

function formatNextAvailableDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card px-5 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-mute">{text}</p>
    </div>
  );
}
