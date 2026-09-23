export type NotifyKind = 'in' | 'out' | 'countdown';

export type NotifyItem = {
  id: string;
  kind: NotifyKind;
  title: string;
  text: string;
  at: string;
  read: boolean;
  /** Set when marked read; used for 2-day read expiry. */
  readAt?: string | null;
};

export type NotifySettings = {
  enabled: boolean;
  inSound: string;
  outSound: string;
  countdownSound: string;
};

export const SOUND_LIBRARY = [
  { id: 'chime', label: 'Chime', src: '/sounds/chime.wav' },
  { id: 'ding', label: 'Ding', src: '/sounds/ding.wav' },
  { id: 'alert', label: 'Alert', src: '/sounds/alert.wav' },
  { id: 'pop', label: 'Pop', src: '/sounds/pop.wav' },
] as const;

const SETTINGS_KEY = 'kavion-notify-settings';
const FEED_KEY = 'kavion-notify-feed';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Read notifications vanish after this many days from readAt. */
export const NOTIFY_READ_TTL_MS = 2 * DAY_MS;
/** All notifications vanish after this many days from creation. */
export const NOTIFY_MAX_AGE_MS = 7 * DAY_MS;

const DEFAULTS: NotifySettings = {
  enabled: true,
  inSound: 'ding',
  outSound: 'pop',
  countdownSound: 'alert',
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeNotify(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readNotifySettings(): NotifySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function writeNotifySettings(next: Partial<NotifySettings>) {
  const merged = { ...readNotifySettings(), ...next };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  emit();
  return merged;
}

function isExpired(item: NotifyItem, now = Date.now()) {
  const created = new Date(item.at).getTime();
  if (!Number.isFinite(created) || now - created >= NOTIFY_MAX_AGE_MS) return true;
  if (!item.read) return false;
  const readAt = item.readAt ? new Date(item.readAt).getTime() : created;
  if (!Number.isFinite(readAt)) return true;
  return now - readAt >= NOTIFY_READ_TTL_MS;
}

function writeFeed(feed: NotifyItem[]) {
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
  emit();
  return feed;
}

/** Drop read (>2d) and any (>7d) items; persists if anything changed. */
export function pruneNotifyFeed(feed = readNotifyFeedRaw()): NotifyItem[] {
  const next = feed.filter((item) => !isExpired(item));
  if (next.length !== feed.length) {
    localStorage.setItem(FEED_KEY, JSON.stringify(next));
    emit();
  }
  return next;
}

function readNotifyFeedRaw(): NotifyItem[] {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    return raw ? (JSON.parse(raw) as NotifyItem[]) : [];
  } catch {
    return [];
  }
}

export function readNotifyFeed(): NotifyItem[] {
  return pruneNotifyFeed(readNotifyFeedRaw());
}

export function pushNotify(item: Omit<NotifyItem, 'id' | 'at' | 'read' | 'readAt'>) {
  const next: NotifyItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    read: false,
    readAt: null,
  };
  const feed = [next, ...pruneNotifyFeed(readNotifyFeedRaw())].slice(0, 40);
  return writeFeed(feed)[0];
}

export function markNotifyRead() {
  const now = new Date().toISOString();
  const feed = pruneNotifyFeed(readNotifyFeedRaw()).map((item) =>
    item.read ? item : { ...item, read: true, readAt: now }
  );
  return writeFeed(feed);
}

export function markNotifyReadOne(id: string) {
  const now = new Date().toISOString();
  const feed = pruneNotifyFeed(readNotifyFeedRaw()).map((item) =>
    item.id === id && !item.read ? { ...item, read: true, readAt: now } : item
  );
  return writeFeed(feed);
}

export function soundSrc(id: string) {
  return SOUND_LIBRARY.find((item) => item.id === id)?.src || SOUND_LIBRARY[0].src;
}

export function playNotifySound(kind: NotifyKind) {
  const settings = readNotifySettings();
  if (!settings.enabled) return;
  const id = kind === 'in' ? settings.inSound : kind === 'out' ? settings.outSound : settings.countdownSound;
  const audio = new Audio(soundSrc(id));
  audio.volume = 0.85;
  void audio.play().catch(() => undefined);
}

export function showNotifyBanner(kind: NotifyKind, title: string, text: string) {
  pushNotify({ kind, title, text });
  playNotifySound(kind);
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body: text, silent: true });
  } catch {
    // ignore blocked banners
  }
}

export function previewSound(id: string) {
  const audio = new Audio(soundSrc(id));
  audio.volume = 0.85;
  void audio.play().catch(() => undefined);
}
