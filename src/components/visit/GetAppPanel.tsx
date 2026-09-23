import { Download01Icon, Notification01Icon, Share01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { publicUploadUrl } from '../../lib/api';
import { cn } from '../../lib/cn';
import { askNotifications } from '../../lib/visitIdentity';
import {
  resolveVisitTheme,
  VISIT_THEMES,
  writePersonalVisitTheme,
  writeVisitTheme,
  type VisitThemeId,
} from '../../lib/visitTheme';
import { CenteredOverlay } from './CenteredOverlay';
import {
  consumeInstallPrompt,
  isIosDevice,
  isStandaloneApp,
  peekInstallPrompt,
  subscribeInstallPrompt,
} from '../../lib/installPrompt';

export function GetAppPanel({
  organizationName,
  logoFile,
  themeScope,
  orgDefaultTheme,
  onNotificationsGranted,
  onThemeChange,
}: {
  organizationName: string;
  logoFile?: string | null;
  /** Org/code scope — personal theme saved only for this visitor phone */
  themeScope?: string | null;
  orgDefaultTheme?: VisitThemeId | null;
  onNotificationsGranted?: () => void;
  onThemeChange?: (theme: VisitThemeId) => void;
}) {
  const logo = publicUploadUrl(logoFile) || '/pwa-192.png';
  const [, setCanPrompt] = useState(() => Boolean(peekInstallPrompt()));
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [iosGuide, setIosGuide] = useState(false);
  const [androidGuide, setAndroidGuide] = useState(false);
  const [theme, setTheme] = useState<VisitThemeId>(() =>
    resolveVisitTheme(themeScope, orgDefaultTheme)
  );
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  useEffect(() => {
    setTheme(resolveVisitTheme(themeScope, orgDefaultTheme));
  }, [themeScope, orgDefaultTheme]);

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    const off = subscribeInstallPrompt(() => setCanPrompt(Boolean(peekInstallPrompt())));
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      off();
    };
  }, []);

  const pickTheme = (next: VisitThemeId) => {
    setTheme(next);
    if (themeScope) writePersonalVisitTheme(themeScope, next);
    else writeVisitTheme(next);
    onThemeChange?.(next);
  };

  const addShortcut = async () => {
    if (installed || isStandaloneApp()) {
      setInstalled(true);
      toast.success('App shortcut is already on this phone');
      return;
    }
    const promptEvent = peekInstallPrompt();
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      consumeInstallPrompt();
      setCanPrompt(false);
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        toast.success('App shortcut added');
      }
      return;
    }
    if (isIosDevice()) {
      setIosGuide(true);
      return;
    }
    setAndroidGuide(true);
  };

  const enableNotifications = async () => {
    const next = await askNotifications();
    setPermission(next);
    if (next === 'granted') {
      onNotificationsGranted?.();
      toast.success('Phone notifications enabled');
    } else toast.error('Allow notifications from your phone browser settings');
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[0_12px_30px_rgba(15,39,68,0.06)]">
        <div className="bg-[#f4fbf8] px-5 pt-7 pb-5 text-center">
          <span className="mx-auto grid size-[5.5rem] place-items-center overflow-hidden rounded-[1.7rem] bg-white shadow-[0_12px_30px_rgba(15,39,68,0.10)]">
            <img src={logo} alt="" className="size-full object-cover" />
          </span>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">Get app</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{organizationName}</h2>
          <span className="mx-auto mt-2 block h-1 w-10 rounded-full bg-primary" />
          <p className="mt-3 text-sm text-mute">
            {installed
              ? 'This visit is installed as an app on your phone.'
              : 'Install this organisation app on your home screen with the logo.'}
          </p>
        </div>
        <div className="bg-[#f4fbf8] px-5 pb-5">
          <div className="rounded-[1.4rem] bg-white/70 p-2">
            <button
              type="button"
              onClick={() => void addShortcut()}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(15,39,68,0.08)] transition hover:shadow-[0_12px_32px_rgba(15,39,68,0.12)] active:scale-[0.99]"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary text-white">
                <HugeiconsIcon
                  icon={installed ? Tick02Icon : Download01Icon}
                  size={15}
                  color="currentColor"
                  strokeWidth={2}
                />
              </span>
              {installed ? 'App installed' : 'Get app'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-card px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-bg text-ink">
            <HugeiconsIcon icon={Notification01Icon} size={18} color="currentColor" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Phone notifications</p>
            <p className="mt-1 text-xs text-mute">
              {permission === 'granted'
                ? 'Notifications go to this phone, not email. We will not ask again on this device.'
                : isIosDevice() && !installed
                  ? 'On iPhone, add the shortcut first, then allow notifications so alerts reach this phone.'
                  : 'Allow notifications so timer and meeting updates reach this phone.'}
            </p>
            {permission !== 'granted' ? (
              <button
                type="button"
                onClick={() => void enableNotifications()}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
              >
                Allow phone notifications
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-card px-5 py-5">
        <p className="text-sm font-semibold text-ink">Choose BG theme</p>
        <p className="mt-1 text-xs text-mute">
          Your pick is saved on this phone only. Org default comes from Home Element.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {VISIT_THEMES.map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickTheme(item.id)}
                className="group flex flex-col items-center gap-1.5"
                aria-pressed={active}
              >
                <span
                  className={cn(
                    'visit-theme-swatch relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 shadow-sm transition',
                    `visit-theme-swatch-${item.id}`,
                    active ? 'border-primary ring-2 ring-primary/20' : 'border-white/80 group-hover:border-line'
                  )}
                >
                  {active ? (
                    <span className="absolute inset-x-0 bottom-1 mx-auto grid size-5 place-items-center rounded-full bg-primary text-white shadow">
                      <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2.2} />
                    </span>
                  ) : null}
                </span>
                <span className={cn('text-[10px] font-semibold', active ? 'text-ink' : 'text-mute')}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {iosGuide ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-lg">
            <p className="text-base font-semibold text-ink">Add {organizationName} to Home Screen</p>
            <p className="mt-1 text-sm text-mute">iPhone cannot add the app automatically. Follow these 3 steps:</p>
            <ol className="mt-4 space-y-3 text-sm text-fog">
              <li className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-ink">
                  <HugeiconsIcon icon={Share01Icon} size={16} color="currentColor" strokeWidth={1.8} />
                </span>
                <span>
                  Tap the <strong className="text-ink">Share</strong> button at the bottom of Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-ink">
                  2
                </span>
                <span>
                  Scroll and tap <strong className="text-ink">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-ink">
                  3
                </span>
                <span>
                  Tap <strong className="text-ink">Add</strong>. The school logo becomes the app icon.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setIosGuide(false)}
              className="mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </CenteredOverlay>
      ) : null}

      {androidGuide ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-lg">
            <p className="text-base font-semibold text-ink">Install this visit as an app</p>
            <p className="mt-1 text-sm text-mute">Open this page in Chrome, then:</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-fog">
              <li>Tap the Chrome menu (three dots).</li>
              <li>
                Tap <strong className="text-ink">Add to Home screen</strong> or <strong className="text-ink">Install app</strong>.
              </li>
              <li>Tap Add. Use this shortcut next time — notifications reach the phone from it.</li>
            </ol>
            <button
              type="button"
              onClick={() => setAndroidGuide(false)}
              className="mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </CenteredOverlay>
      ) : null}
    </div>
  );
}
