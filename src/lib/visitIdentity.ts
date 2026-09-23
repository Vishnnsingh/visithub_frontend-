export function visitorUidKey(organizationId: string) {
  return `kavion-visitor-uid:${organizationId}`;
}

export function openVisitKey(organizationId: string) {
  return `kavion-open-visit:${organizationId}`;
}

export function readVisitorUid(organizationId?: string | null) {
  if (!organizationId) return '';
  return window.localStorage.getItem(visitorUidKey(organizationId)) || '';
}

export function writeVisitorUid(organizationId: string, uid: string) {
  window.localStorage.setItem(visitorUidKey(organizationId), uid);
}

export function readOpenVisit(organizationId?: string | null) {
  if (!organizationId) return '';
  return window.localStorage.getItem(openVisitKey(organizationId)) || '';
}

export function writeOpenVisit(organizationId: string, visitorId: string) {
  window.localStorage.setItem(openVisitKey(organizationId), visitorId);
}

export function clearOpenVisit(organizationId: string) {
  window.localStorage.removeItem(openVisitKey(organizationId));
}

export type VisitTab = 'home' | 'meeting' | 'details' | 'history' | 'app';

export type VisitGoogleAccount = {
  email: string;
  googleToken: string;
  auth?: 'google' | 'phone';
  visitorUid: string | null;
  profile: {
    visitorName?: string | null;
    mobileNumber?: string | null;
    addressCompany?: string | null;
    email?: string | null;
    personToMeet?: string | null;
    department?: string | null;
    purpose?: string | null;
    vehicleNumber?: string | null;
  } | null;
};

export type VisitSession = {
  visitorId: string;
  tab: VisitTab;
  google: VisitGoogleAccount | null;
};

export function googleTokenExpiry(token?: string | null) {
  const parts = String(token || '').split('.');
  if (parts.length >= 3) {
    const exp = Number(parts[1]);
    return Number.isFinite(exp) ? exp : 0;
  }
  const exp = Number(parts[0]);
  return Number.isFinite(exp) ? exp : 0;
}

export function isGoogleSessionFresh(token?: string | null) {
  return Boolean(token && googleTokenExpiry(token) > Date.now());
}

function googleAccountKey(organizationId: string) {
  return `kavion-google-account:${organizationId}`;
}

function lastGoogleEmailKey(organizationId: string) {
  return `kavion-last-google-email:${organizationId}`;
}

/** Last Google email on this device (kept after session expire for silent re-login hint). */
export function readLastGoogleEmail(organizationId?: string | null) {
  if (!organizationId) return '';
  return window.localStorage.getItem(lastGoogleEmailKey(organizationId)) || '';
}

export function writeLastGoogleEmail(organizationId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  window.localStorage.setItem(lastGoogleEmailKey(organizationId), normalized);
  window.localStorage.setItem('kavion-last-google-email', normalized);
  rememberGoogleEmail(normalized);
}

/** Org hint, else last Google email used anywhere on this device */
export function readPreferredGoogleEmail(organizationId?: string | null) {
  return readLastGoogleEmail(organizationId) || window.localStorage.getItem('kavion-last-google-email') || '';
}

const knownGoogleEmailsKey = 'kavion-known-google-emails';

/** Emails previously used with Continue with Google on this device (for in-app chooser). */
export function readKnownGoogleEmails(): string[] {
  try {
    const raw = window.localStorage.getItem(knownGoogleEmailsKey);
    if (!raw) {
      const last = window.localStorage.getItem('kavion-last-google-email');
      return last ? [last] : [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const emails = parsed
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item.includes('@'));
    return [...new Set(emails)];
  } catch {
    return [];
  }
}

export function rememberGoogleEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return;
  const next = [normalized, ...readKnownGoogleEmails().filter((item) => item !== normalized)].slice(0, 10);
  window.localStorage.setItem(knownGoogleEmailsKey, JSON.stringify(next));
  window.localStorage.setItem('kavion-last-google-email', normalized);
}

function googleReturnKey(organizationId: string) {
  return `kavion-google-return:${organizationId}`;
}

function toGoogleAccount(parsed: Partial<VisitGoogleAccount>): VisitGoogleAccount | null {
  const auth = parsed.auth === 'phone' ? 'phone' : 'google';
  if (!parsed.googleToken) return null;
  if (auth === 'google' && !parsed.email) return null;
  return {
    email: parsed.email || '',
    googleToken: parsed.googleToken,
    auth,
    visitorUid: parsed.visitorUid || null,
    profile: parsed.profile || null,
  };
}

/** Keeps last Google session on device so DB-returning visitors skip Google account chooser. */
export function writeGoogleReturn(organizationId: string, account: VisitGoogleAccount) {
  if (account.auth === 'phone' || !account.email || !account.googleToken) return;
  window.localStorage.setItem(googleReturnKey(organizationId), JSON.stringify(account));
  writeLastGoogleEmail(organizationId, account.email);
}

export function readGoogleReturn(organizationId?: string | null): VisitGoogleAccount | null {
  if (!organizationId) return null;
  try {
    const raw = window.localStorage.getItem(googleReturnKey(organizationId));
    if (!raw) return null;
    return toGoogleAccount(JSON.parse(raw) as Partial<VisitGoogleAccount>);
  } catch {
    return null;
  }
}

export function clearGoogleReturn(organizationId?: string | null) {
  if (!organizationId) return;
  window.localStorage.removeItem(googleReturnKey(organizationId));
}

export function readGoogleAccount(organizationId?: string | null): VisitGoogleAccount | null {
  if (!organizationId) return null;
  try {
    const raw = window.localStorage.getItem(googleAccountKey(organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitGoogleAccount>;
    const account = toGoogleAccount(parsed);
    if (!account) {
      window.localStorage.removeItem(googleAccountKey(organizationId));
      return null;
    }
    if (!isGoogleSessionFresh(account.googleToken)) {
      if (account.auth !== 'phone') writeGoogleReturn(organizationId, account);
      window.localStorage.removeItem(googleAccountKey(organizationId));
      return null;
    }
    if (account.auth === 'google' && account.email) writeLastGoogleEmail(organizationId, account.email);
    writeGoogleReturn(organizationId, account);
    return account;
  } catch {
    return null;
  }
}

export function writeGoogleAccount(organizationId: string, account: VisitGoogleAccount) {
  window.localStorage.setItem(googleAccountKey(organizationId), JSON.stringify(account));
  if (account.auth !== 'phone' && account.email) {
    writeLastGoogleEmail(organizationId, account.email);
    writeGoogleReturn(organizationId, account);
  }
  return account;
}

export function clearGoogleAccount(organizationId?: string | null) {
  if (!organizationId) return;
  try {
    const raw = window.localStorage.getItem(googleAccountKey(organizationId));
    if (raw) {
      const account = toGoogleAccount(JSON.parse(raw) as Partial<VisitGoogleAccount>);
      if (account && account.auth !== 'phone') writeGoogleReturn(organizationId, account);
    }
  } catch {
    /* ignore */
  }
  window.localStorage.removeItem(googleAccountKey(organizationId));
}

export function clearVisitAuth(code: string, organizationId?: string | null) {
  writeVisitSession(code, { google: null, visitorId: '' });
  clearGoogleAccount(organizationId);
  if (organizationId) clearOpenVisit(organizationId);
  try {
    window.sessionStorage.removeItem(`visitor-entry:${code}`);
  } catch {
    /* ignore */
  }
}

function sessionKey(organizationId: string) {
  return `kavion-visit-session:${organizationId}`;
}

function isTab(value: unknown): value is VisitTab {
  return value === 'home' || value === 'meeting' || value === 'details' || value === 'history' || value === 'app';
}

export function readVisitSession(organizationId?: string | null): VisitSession | null {
  if (!organizationId) return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitSession>;
    return {
      visitorId: typeof parsed.visitorId === 'string' ? parsed.visitorId : '',
      tab: isTab(parsed.tab) ? parsed.tab : 'home',
      google:
        parsed.google?.googleToken && isGoogleSessionFresh(parsed.google.googleToken)
          ? {
              email: parsed.google.email || '',
              googleToken: parsed.google.googleToken,
              auth: parsed.google.auth === 'phone' ? 'phone' : 'google',
              visitorUid: parsed.google.visitorUid || null,
              profile: parsed.google.profile || null,
            }
          : null,
    };
  } catch {
    return null;
  }
}

export function writeVisitSession(organizationId: string, patch: Partial<VisitSession>) {
  const current = readVisitSession(organizationId) || { visitorId: '', tab: 'home' as const, google: null };
  const next: VisitSession = {
    visitorId: patch.visitorId !== undefined ? patch.visitorId : current.visitorId,
    tab: patch.tab !== undefined ? patch.tab : current.tab,
    google: patch.google !== undefined ? patch.google : current.google,
  };
  window.sessionStorage.setItem(sessionKey(organizationId), JSON.stringify(next));
  return next;
}

export async function askNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function registerVisitApp(
  organizationName: string,
  startUrl: string,
  iconFile: string | null,
  visitCode?: string
) {
  const code =
    visitCode ||
    (startUrl.startsWith('/g/') ? startUrl.replace(/^\/g\//, '').split(/[/?#]/)[0] : '');
  if (!code) return '';
  const params = new URLSearchParams({
    name: organizationName,
    icon: iconFile || '',
    start: startUrl,
  });
  const manifestHref = `/g/${code}/manifest.webmanifest?${params.toString()}`;
  const touchIcon = iconFile
    ? `${String(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/i, '')}/uploads/${iconFile}`
    : '/pwa-192.png';

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = manifestHref;

  let touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!touch) {
    touch = document.createElement('link');
    touch.rel = 'apple-touch-icon';
    document.head.appendChild(touch);
  }
  touch.href = touchIcon;

  let titleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!titleMeta) {
    titleMeta = document.createElement('meta');
    titleMeta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(titleMeta);
  }
  titleMeta.content = organizationName;
  document.title = organizationName;

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw.js');
  }
  return manifestHref;
}
