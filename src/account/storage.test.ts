import { describe, it, expect, vi, afterEach } from 'vitest';
import { baseUrlFor, forget, load, mask, save } from './storage';

const KEY = 'zeepler-web-starter.account';
const saved = { apiKey: 'zpl_abcdefgh1234', region: 'ca' as const, customUrl: '', remember: true };

afterEach(() => vi.restoreAllMocks());

describe('key storage', () => {
  it('remembers in localStorage when asked to', () => {
    save(saved);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(load()).toEqual(saved);
  });

  it('keeps it in sessionStorage otherwise, and clears the other store', () => {
    save(saved);
    save({ ...saved, remember: false });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(load()).toEqual({ ...saved, remember: false });
  });

  it('forgets from both stores', () => {
    save(saved);
    forget();
    expect(load()).toBeNull();
  });

  it('ignores something unreadable', () => {
    localStorage.setItem(KEY, '{not json');
    expect(load()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ apiKey: 'zpl_x', region: 'mars' }));
    expect(load()).toBeNull();
  });

  it('carries on when storage throws, as it can in a private window', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(save(saved)).toBe(false);
    expect(load()).toBeNull();
    expect(() => forget()).not.toThrow();
  });

  it('masks all but the last four characters', () => {
    expect(mask('zpl_abcdefgh1234')).toBe('zpl_…1234');
    expect(mask('zpl_')).toBe('zpl_…');
  });

  it('resolves the base URL for each region', () => {
    expect(baseUrlFor({ region: 'us', customUrl: '' })).toBe('https://api.zeepler.com');
    expect(baseUrlFor({ region: 'ca', customUrl: '' })).toBe('https://api.ca.zeepler.com');
    expect(baseUrlFor({ region: 'custom', customUrl: ' https://acme.api.zeepler.com ' })).toBe(
      'https://acme.api.zeepler.com',
    );
  });
});
