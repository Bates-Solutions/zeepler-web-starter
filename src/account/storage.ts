/**
 * Where the API key is kept between visits.
 *
 * "Remember on this device" puts it in localStorage; otherwise it goes in
 * sessionStorage and is gone when the tab closes. ⚠️ Neither hides the key from
 * JavaScript running on this page: see "Security" in the README.
 *
 * Storage can be missing or throw (a private window, blocked site data), so
 * every access is guarded and a failure just means nothing is remembered.
 */

import { REGIONS } from '../api/zeepler';

const KEY = 'zeepler-web-starter.account';

export type Region = keyof typeof REGIONS | 'custom';

export interface Saved {
  apiKey: string;
  region: Region;
  /** Used when `region` is `custom`, for a dedicated deployment. */
  customUrl: string;
  remember: boolean;
}

export const baseUrlFor = (saved: Pick<Saved, 'region' | 'customUrl'>) =>
  saved.region === 'custom' ? saved.customUrl.trim() : REGIONS[saved.region].baseUrl;

/** Each store with whether it is the remembering one, skipping any that are unavailable. */
const stores = (): [Storage, boolean][] => {
  const found: [Storage, boolean][] = [];
  for (const [get, remember] of [
    [() => window.localStorage, true],
    [() => window.sessionStorage, false],
  ] as const) {
    try {
      found.push([get(), remember]);
    } catch {
      // unavailable
    }
  }
  return found;
};

const isRegion = (value: unknown): value is Region =>
  value === 'custom' || (typeof value === 'string' && Object.hasOwn(REGIONS, value));

export function load(): Saved | null {
  for (const [store, remember] of stores()) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;
      const { apiKey, region, customUrl } = parsed as Record<string, unknown>;
      if (typeof apiKey !== 'string' || !isRegion(region)) continue;
      return { apiKey, region, customUrl: typeof customUrl === 'string' ? customUrl : '', remember };
    } catch {
      // unreadable: treat as nothing saved
    }
  }
  return null;
}

/** Save to the chosen store and clear the other, so the key lives in one place only. Returns false if it could not be saved. */
export function save(saved: Saved): boolean {
  forget();
  const { remember, ...rest } = saved;
  try {
    (remember ? window.localStorage : window.sessionStorage).setItem(KEY, JSON.stringify(rest));
    return true;
  } catch {
    return false;
  }
}

export function forget(): void {
  for (const [store] of stores()) {
    try {
      store.removeItem(KEY);
    } catch {
      // nothing to do
    }
  }
}

/** `zpl_…a1b2`: enough to tell keys apart, not enough to use one. */
export const mask = (apiKey: string) => (apiKey.length > 8 ? `zpl_…${apiKey.slice(-4)}` : 'zpl_…');
