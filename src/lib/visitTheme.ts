export type VisitThemeId = 'default' | 'mint' | 'blossom' | 'lavender' | 'peach' | 'sky' | 'citrus';

export type VisitTheme = {
  id: VisitThemeId;
  label: string;
  hint: string;
};

export const VISIT_THEMES: VisitTheme[] = [
  { id: 'default', label: 'White', hint: 'Clean light' },
  { id: 'mint', label: 'Mint', hint: 'Soft green' },
  { id: 'blossom', label: 'Blossom', hint: 'Soft pink' },
  { id: 'lavender', label: 'Lavender', hint: 'Soft purple' },
  { id: 'peach', label: 'Peach', hint: 'Warm petals' },
  { id: 'sky', label: 'Sky', hint: 'Soft blue' },
  { id: 'citrus', label: 'Citrus', hint: 'Soft yellow' },
];

const LEGACY_KEY = 'kavion-visit-bg-theme';

function personalKey(scope: string) {
  return `${LEGACY_KEY}:${scope}`;
}

export function isVisitThemeId(value: unknown): value is VisitThemeId {
  return VISIT_THEMES.some((theme) => theme.id === value);
}

function normalizeTheme(raw: string | null): VisitThemeId | null {
  if (!raw) return null;
  if (raw === 'midnight' || raw === 'mist') return 'blossom';
  return isVisitThemeId(raw) ? raw : null;
}

/** Personal override for this visitor phone + org/code. null = use org default */
export function readPersonalVisitTheme(scope?: string | null): VisitThemeId | null {
  if (!scope) return null;
  try {
    const personal = normalizeTheme(window.localStorage.getItem(personalKey(scope)));
    if (personal) return personal;
    // One-time migrate legacy global key into this scope
    const legacy = normalizeTheme(window.localStorage.getItem(LEGACY_KEY));
    if (legacy) {
      window.localStorage.setItem(personalKey(scope), legacy);
      window.localStorage.removeItem(LEGACY_KEY);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writePersonalVisitTheme(scope: string, theme: VisitThemeId) {
  try {
    window.localStorage.setItem(personalKey(scope), theme);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('kavion-visit-theme', { detail: { theme, scope } }));
}

/** Org default from Home Element, unless this visitor picked their own */
export function resolveVisitTheme(scope: string | null | undefined, orgDefault?: VisitThemeId | null): VisitThemeId {
  const personal = readPersonalVisitTheme(scope);
  if (personal) return personal;
  if (orgDefault && isVisitThemeId(orgDefault)) return orgDefault;
  return 'default';
}

/** @deprecated use resolveVisitTheme / writePersonalVisitTheme */
export function readVisitTheme(scope?: string | null, orgDefault?: VisitThemeId | null): VisitThemeId {
  return resolveVisitTheme(scope, orgDefault);
}

/** @deprecated use writePersonalVisitTheme */
export function writeVisitTheme(theme: VisitThemeId, scope?: string | null) {
  if (scope) {
    writePersonalVisitTheme(scope, theme);
    return;
  }
  try {
    window.localStorage.setItem(LEGACY_KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('kavion-visit-theme', { detail: { theme, scope: null } }));
}

export function visitThemeClass(theme: VisitThemeId) {
  return `visit-theme-${theme}`;
}
