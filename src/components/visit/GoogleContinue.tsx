import { ArrowRight01Icon, Cancel01Icon, FlashIcon, SecurityCheckIcon, SmartPhone01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { publicUploadUrl } from '../../lib/api';
import { readGoogleReturn, readKnownGoogleEmails, rememberGoogleEmail } from '../../lib/visitIdentity';
import { CenteredOverlay } from './CenteredOverlay';

type GoogleContinueProps = {
  name: string;
  logoFile?: string | null;
  welcomeImageFile?: string | null;
  clientId?: string | null;
  organizationId?: string | null;
  loading?: boolean;
  phoneLoading?: boolean;
  showGoogle?: boolean;
  showNumber?: boolean;
  /** Prefer this Google account — skips account chooser when that session is active */
  loginHint?: string | null;
  /** Returning DB visitor on this device — resume without Google account popup */
  onResumeReturning?: (account: { email: string; googleToken: string }) => Promise<boolean>;
  /** Email already continued before (in DB) — auto enter, no Google chooser */
  onResumeDbEmail?: (email: string) => Promise<boolean>;
  onCredential: (credential: string) => void;
  onContinueWithNumber?: (mobile: string) => void;
};

type Palette = {
  dark: string;
  accent: string;
  soft: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            login_hint?: string;
            itp_support?: boolean;
            use_fedcm_for_button?: boolean;
            button_auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const FALLBACK: Palette = { dark: '#0f2744', accent: '#1fa97a', soft: '#e7f7f1' };

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function extractPalette(image: HTMLImageElement): Palette {
  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 36;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return FALLBACK;
  context.drawImage(image, 0, 0, 36, 36);
  const pixels = context.getImageData(0, 0, 36, 36).data;
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 80) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (luminance(r, g, b) > 0.92) continue;
    const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
    const current = buckets.get(key);
    if (current) {
      current.r += r;
      current.g += g;
      current.b += b;
      current.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  const colors = [...buckets.values()]
    .map((item) => ({
      r: item.r / item.n,
      g: item.g / item.n,
      b: item.b / item.n,
      n: item.n,
    }))
    .sort((a, b) => b.n - a.n);
  if (!colors.length) return FALLBACK;
  const dark =
    [...colors].sort((a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b) || b.n - a.n)[0] || colors[0];
  const accent =
    [...colors].sort(
      (a, b) => saturation(b.r, b.g, b.b) * b.n - saturation(a.r, a.g, a.b) * a.n || b.n - a.n
    )[0] || colors[0];
  return {
    dark: rgb(Math.min(dark.r, 40), Math.min(dark.g, 55), Math.min(dark.b, 80)),
    accent: rgb(accent.r, accent.g, accent.b),
    soft: rgb((accent.r + 245) / 2, (accent.g + 248) / 2, (accent.b + 245) / 2),
  };
}

function mixPalettes(a: Palette, b: Palette): Palette {
  const parse = (value: string) => value.match(/\d+/g)?.map(Number) || [15, 39, 68];
  const mix = (left: string, right: string, amount: number) => {
    const x = parse(left);
    const y = parse(right);
    return rgb(x[0] * (1 - amount) + y[0] * amount, x[1] * (1 - amount) + y[1] * amount, x[2] * (1 - amount) + y[2] * amount);
  };
  return {
    dark: mix(a.dark, b.dark, 0.28),
    accent: mix(a.accent, b.accent, 0.45),
    soft: mix(a.soft, b.soft, 0.35),
  };
}

const paletteCache = new Map<string, Palette>();

function usePalette(urls: Array<string | null>) {
  const key = urls.filter(Boolean).join('|');
  const [palette, setPalette] = useState<Palette>(() => (key && paletteCache.get(key)) || FALLBACK);
  useEffect(() => {
    if (!key) {
      setPalette(FALLBACK);
      return;
    }
    const cached = paletteCache.get(key);
    if (cached) {
      setPalette(cached);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const found: Palette[] = [];
      for (const url of urls) {
        if (!url) continue;
        const image = await new Promise<HTMLImageElement | null>((resolve) => {
          const next = new Image();
          next.decoding = 'async';
          next.onload = () => resolve(next);
          next.onerror = () => resolve(null);
          next.src = url;
        });
        if (image) found.push(extractPalette(image));
      }
      if (cancelled || !found.length) return;
      const next = found.length === 1 ? found[0] : mixPalettes(found[0], found[1]);
      paletteCache.set(key, next);
      setPalette(next);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return palette;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: name, last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

export function GoogleContinue({
  name,
  logoFile,
  welcomeImageFile,
  clientId,
  organizationId,
  loading,
  phoneLoading,
  showGoogle = true,
  showNumber = true,
  loginHint,
  onResumeReturning,
  onResumeDbEmail,
  onCredential,
  onContinueWithNumber,
}: GoogleContinueProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const googleReadyRef = useRef(false);
  const activeHintRef = useRef((loginHint || '').trim().toLowerCase());
  const signInTimerRef = useRef<number | null>(null);
  const [numberOpen, setNumberOpen] = useState(false);
  const [mobile, setMobile] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [knownEmails, setKnownEmails] = useState(() => readKnownGoogleEmails());
  const logo = publicUploadUrl(logoFile);
  const welcome = publicUploadUrl(welcomeImageFile);
  const palette = usePalette([logo, welcome]);
  const { first, last } = splitName(name);
  const busy = Boolean(loading || phoneLoading || signingIn);

  const clearSignInWait = () => {
    if (signInTimerRef.current != null) {
      window.clearTimeout(signInTimerRef.current);
      signInTimerRef.current = null;
    }
    setSigningIn(false);
  };

  const submitNumber = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    onContinueWithNumber?.(mobile);
  };

  const setupGoogle = (emailHint: string) => {
    if (!clientId || !window.google?.accounts?.id) return false;
    activeHintRef.current = emailHint;
    // No FedCM — status/button 403 + FedCM fail was leaving Signing in stuck
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        clearSignInWait();
        setPickerOpen(false);
        if (response.credential) onCredentialRef.current(response.credential);
      },
      auto_select: Boolean(emailHint),
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      ...(emailHint ? { login_hint: emailHint } : {}),
    });
    if (buttonRef.current) {
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      });
    }
    googleReadyRef.current = true;
    return true;
  };

  useEffect(() => {
    if (!showGoogle || !clientId) return;
    let cancelled = false;
    googleReadyRef.current = false;
    void loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        setupGoogle((loginHint || '').trim().toLowerCase());
      })
      .catch(() => toast.error('Could not load Google sign-in'));
    return () => {
      cancelled = true;
      googleReadyRef.current = false;
      if (signInTimerRef.current != null) window.clearTimeout(signInTimerRef.current);
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [clientId, showGoogle, loginHint]);

  useEffect(() => {
    if (!loading) clearSignInWait();
  }, [loading]);

  const clickGoogleButton = (attempt = 0) => {
    const hidden = buttonRef.current?.querySelector<HTMLElement>('div[role="button"]');
    if (hidden) {
      hidden.click();
      return;
    }
    if (attempt < 15) {
      window.setTimeout(() => clickGoogleButton(attempt + 1), 80);
      return;
    }
    clearSignInWait();
    toast.error('Google sign-in is not ready. Try again.');
  };

  const runGoogleSignIn = async (emailHint: string) => {
    if (!clientId) return;
    setPickerOpen(false);
    setSigningIn(true);
    if (emailHint) rememberGoogleEmail(emailHint);

    // 1) Device token resume
    const returning = organizationId ? readGoogleReturn(organizationId) : null;
    if (
      emailHint &&
      returning?.email === emailHint &&
      returning.googleToken &&
      onResumeReturning
    ) {
      try {
        const ok = await onResumeReturning({
          email: returning.email,
          googleToken: returning.googleToken,
        });
        if (ok) {
          clearSignInWait();
          return;
        }
      } catch {
        /* fall through */
      }
    }

    // 2) Already in DB (continued before) → no Google "Choose an account"
    if (emailHint && onResumeDbEmail) {
      try {
        const ok = await onResumeDbEmail(emailHint);
        if (ok) {
          clearSignInWait();
          return;
        }
      } catch {
        /* fall through to first-time Google */
      }
    }

    if (!window.google?.accounts?.id) {
      clearSignInWait();
      toast.error('Google sign-in is still loading. Try again.');
      return;
    }
    setupGoogle(emailHint);

    if (signInTimerRef.current != null) window.clearTimeout(signInTimerRef.current);
    signInTimerRef.current = window.setTimeout(() => {
      setSigningIn(false);
      signInTimerRef.current = null;
    }, 15000);

    window.setTimeout(() => clickGoogleButton(), 120);
  };

  // Known email on this phone → try DB auto-enter as soon as screen opens
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (!showGoogle || loading || phoneLoading || autoTriedRef.current) return;
    const hint = (loginHint || '').trim().toLowerCase();
    const emails = readKnownGoogleEmails();
    const autoEmail = emails.length === 1 ? emails[0] : hint;
    if (!autoEmail || !onResumeDbEmail) return;
    if (emails.length > 1) return;
    autoTriedRef.current = true;
    let cancelled = false;
    void (async () => {
      setSigningIn(true);
      try {
        const ok = await onResumeDbEmail(autoEmail);
        if (cancelled) return;
        if (ok) {
          clearSignInWait();
          return;
        }
      } catch {
        /* show Continue UI */
      }
      if (!cancelled) clearSignInWait();
    })();
    return () => {
      cancelled = true;
    };
  }, [showGoogle, loginHint, organizationId, loading, phoneLoading, onResumeDbEmail]);

  const startGoogle = () => {
    if (!clientId || busy) return;
    if (!googleReadyRef.current && !window.google?.accounts?.id) {
      toast.error('Google sign-in is still loading. Try again.');
      return;
    }
    const emails = readKnownGoogleEmails();
    setKnownEmails(emails);
    if (emails.length > 1) {
      setPickerOpen(true);
      return;
    }
    if (emails.length === 1) {
      runGoogleSignIn(emails[0]);
      return;
    }
    runGoogleSignIn((loginHint || '').trim().toLowerCase());
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f4fbf8] text-ink">
      <div
        className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full opacity-70"
        style={{ background: palette.soft }}
      />
      <div
        className="pointer-events-none absolute top-32 -right-20 size-52 rounded-full opacity-50"
        style={{ background: palette.soft }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-8">
        <p className="text-center text-sm italic" style={{ color: palette.accent, fontFamily: 'Georgia, serif' }}>
          Visitors Make Our Community Stronger
        </p>

        <span className="mx-auto mt-6 grid size-[5.5rem] place-items-center overflow-hidden rounded-[1.7rem] bg-white shadow-[0_12px_30px_rgba(15,39,68,0.10)]">
          {logo ? (
            <img src={logo} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-3xl font-bold" style={{ color: palette.dark }}>
              {name.slice(0, 1)}
            </span>
          )}
        </span>

        <p className="mt-7 text-center text-[11px] font-semibold tracking-[0.28em] uppercase" style={{ color: palette.accent }}>
          Welcome to
        </p>
        <h1 className="mt-2 text-center text-[2.15rem] leading-[1.05] font-extrabold tracking-tight uppercase">
          {last ? (
            <>
              <span style={{ color: palette.dark }}>{first} </span>
              <span style={{ color: palette.accent }}>{last}</span>
            </>
          ) : (
            <span
              style={{
                backgroundImage: `linear-gradient(90deg, ${palette.dark} 35%, ${palette.accent} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {first}
            </span>
          )}
        </h1>
        <span className="mx-auto mt-3 block h-1 w-10 rounded-full" style={{ background: palette.accent }} />
        <p className="mt-3 text-center text-sm text-fog">
          {showGoogle && showNumber
            ? 'Continue with Google or your mobile number to fill visitor details.'
            : showNumber
              ? 'Continue with your mobile number to fill visitor details.'
              : 'Continue with Google to fill visitor details.'}
        </p>

        {showGoogle ? (
          <div className="relative mt-6">
            <p className="mb-2 text-center text-[11px] font-semibold tracking-[0.22em] uppercase" style={{ color: palette.accent }}>
              Sign in
            </p>
            <button
              type="button"
              disabled={!clientId || busy}
              onClick={startGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] disabled:opacity-60"
            >
              <GoogleMark />
              {busy ? 'Signing in...' : 'Continue with Google'}
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
            </button>
            <div ref={buttonRef} className="pointer-events-none absolute inset-0 overflow-hidden opacity-0" aria-hidden />
          </div>
        ) : null}
        {showGoogle && !clientId ? <p className="mt-3 text-center text-xs text-danger">Google sign-in is not configured.</p> : null}

        {showGoogle && showNumber ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/80" />
            <span className="text-[11px] font-semibold tracking-wide text-mute uppercase">or</span>
            <span className="h-px flex-1 bg-white/80" />
          </div>
        ) : null}

        {showNumber ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setNumberOpen(true)}
            className={`${showGoogle ? 'mt-4' : 'mt-6'} flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] disabled:opacity-60`}
          >
            <HugeiconsIcon icon={SmartPhone01Icon} size={18} color="currentColor" strokeWidth={1.8} />
            {phoneLoading ? 'Opening...' : 'Continue with number'}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
          </button>
        ) : null}

        <div className="mt-8 mb-4 grid grid-cols-3 gap-3 text-center">
          <Feature icon={SecurityCheckIcon} title="Secure" text="Your data is safe" />
          <Feature icon={FlashIcon} title="Quick" text="Check-in in seconds" />
          <Feature icon={UserMultipleIcon} title="Easy" text="Just one tap to continue" />
        </div>
      </div>

      <div className="relative mt-auto">
        {welcome ? (
          <>
            <img src={welcome} alt="" className="h-[34vh] w-full object-cover object-center sm:h-[38vh]" />
            <p className="absolute inset-x-0 bottom-4 text-center text-[10px] font-semibold tracking-[0.22em] text-white uppercase drop-shadow">
              Safe visitors · Brighter tomorrow
            </p>
            <span
              className="absolute bottom-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full"
              style={{ background: palette.accent }}
            />
          </>
        ) : (
          <div className="h-16 w-full" style={{ background: `linear-gradient(180deg, transparent, ${palette.soft})` }} />
        )}
      </div>

      {pickerOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: palette.dark }}>
                Choose account
              </h2>
              <button type="button" onClick={() => setPickerOpen(false)} className="text-mute">
                <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
            <p className="mb-4 text-sm text-mute">Select which Google email to continue with.</p>
            <ul className="space-y-2">
              {knownEmails.map((email) => (
                <li key={email}>
                  <button
                    type="button"
                    onClick={() => runGoogleSignIn(email)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-3 py-3 text-left"
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${palette.dark}, ${palette.accent})` }}
                    >
                      {email.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{email.split('@')[0]}</span>
                      <span className="block truncate text-xs text-mute">{email}</span>
                    </span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => runGoogleSignIn('')}
              className="mt-4 w-full rounded-full border border-line bg-white py-3 text-sm font-semibold text-ink"
            >
              Use another account
            </button>
          </div>
        </CenteredOverlay>
      ) : null}

      {(signingIn || loading) && !pickerOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-xs rounded-3xl bg-card px-6 py-8 text-center shadow-lg">
            <span
              className="mx-auto mb-4 block size-10 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: palette.accent, borderRightColor: palette.dark }}
            />
            <p className="text-base font-semibold" style={{ color: palette.dark }}>
              Signing in…
            </p>
            <p className="mt-1 text-sm text-mute">
              {activeHintRef.current || 'Continue in the Google window'}
            </p>
            <button
              type="button"
              onClick={clearSignInWait}
              className="mt-5 w-full rounded-full border border-line py-2.5 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </CenteredOverlay>
      ) : null}

      {numberOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Enter your number</h2>
              <button type="button" onClick={() => setNumberOpen(false)} className="text-mute">
                <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
            <p className="text-sm text-mute">Use your Indian mobile number to continue.</p>
            <div className="field-input mt-4 flex items-center gap-2 !pl-4">
              <span className="shrink-0 text-sm font-semibold text-ink">+91</span>
              <span className="h-5 w-px bg-line" />
              <input
                className="min-w-0 flex-1 bg-transparent outline-none"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoFocus
                value={mobile}
                placeholder="10-digit mobile number"
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitNumber();
                  }
                }}
              />
            </div>
            <button
              type="button"
              disabled={phoneLoading}
              onClick={submitNumber}
              className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {phoneLoading ? 'Opening...' : 'Continue'}
            </button>
          </div>
        </CenteredOverlay>
      ) : null}
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: IconSvgElement;
  title: string;
  text: string;
}) {
  return (
    <div>
      <span className="mx-auto grid size-9 place-items-center rounded-xl bg-bg text-ink">
        <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
      </span>
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-mute">{text}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.5 7.4l6.2 5.2C38.7 37.4 44 31.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
