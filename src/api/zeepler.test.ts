import { describe, it, expect, beforeEach, vi } from 'vitest';
import { describeError, me, zeeplify } from './zeepler';

const connection = { apiKey: 'zpl_test', baseUrl: 'https://api.zeepler.com/' };
const fetchMock = vi.fn();

const reply = (status: number, body: unknown, type = 'application/json') =>
  fetchMock.mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': type },
    }),
  );

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('me()', () => {
  it('calls GET /v1/me with the key, and no cookies', async () => {
    reply(200, { plan: 'free', labelsThisMonth: 3, cap: 10 });

    expect(await me(connection)).toEqual({ ok: true, value: { plan: 'free', labelsThisMonth: 3, cap: 10 } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.zeepler.com/v1/me');
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', headers: { 'x-api-key': 'zpl_test' } });
  });

  it('reads an uncapped account', async () => {
    reply(200, { plan: 'card', labelsThisMonth: 250, cap: null });
    expect(await me(connection)).toEqual({
      ok: true,
      value: { plan: 'card', labelsThisMonth: 250, cap: null },
    });
  });

  it('turns a 401 into unauthorized, with the API’s reason', async () => {
    reply(401, { error: 'Account disabled' });
    expect(await me(connection)).toEqual({
      ok: false,
      error: { kind: 'unauthorized', message: 'Account disabled' },
    });
  });

  it('reports a request that never got an answer as network', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await me(connection)).toEqual({ ok: false, error: { kind: 'network' } });
  });
});

describe('zeeplify()', () => {
  it('POSTs the body as JSON and returns the ZPL', async () => {
    reply(200, '^XA^XZ', 'text/plain');

    expect(await zeeplify(connection, { config: { size: '4x2' } })).toEqual({ ok: true, value: '^XA^XZ' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.zeepler.com/v1/zeeplify');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ config: { size: '4x2' } });
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'x-api-key': 'zpl_test' });
  });

  it.each([
    [
      400,
      { errors: [{ field: 'templates[0].dataPath', message: 'must be a non-empty string' }] },
      {
        kind: 'invalid',
        errors: [{ field: 'templates[0].dataPath', message: 'must be a non-empty string' }],
      },
    ],
    [
      402,
      {
        error: 'Free monthly labels used',
        message: 'Add a card.',
        cap: 10,
        used: 10,
        dashboard: 'https://zeepler.com/dashboard',
      },
      { kind: 'capped', message: 'Add a card.', dashboard: 'https://zeepler.com/dashboard' },
    ],
    [429, { error: 'Rate limit exceeded', retryAfter: 3 }, { kind: 'rate-limited', retryAfter: 3 }],
    [
      429,
      { error: 'Monthly spending limit exceeded', currentSpend: 50, limit: 50 },
      { kind: 'spending-limit', currentSpend: 50, limit: 50 },
    ],
    [500, { error: 'Internal error' }, { kind: 'server' }],
    [503, 'Service Unavailable', { kind: 'server' }],
  ])('turns a %i into the right error', async (status, body, error) => {
    reply(status, body);
    expect(await zeeplify(connection, {})).toEqual({ ok: false, error });
  });

  it('survives a refusal whose body is not JSON', async () => {
    reply(429, 'Too Many Requests', 'text/plain');
    expect(await zeeplify(connection, {})).toEqual({
      ok: false,
      error: { kind: 'rate-limited', retryAfter: 1 },
    });
  });
});

describe('describeError()', () => {
  it('says how long to wait on a rate limit', () => {
    expect(describeError({ kind: 'rate-limited', retryAfter: 1 })).toBe(
      'Too many requests. Try again in 1 second.',
    );
    expect(describeError({ kind: 'rate-limited', retryAfter: 5 })).toBe(
      'Too many requests. Try again in 5 seconds.',
    );
  });
});
