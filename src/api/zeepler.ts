/**
 * Everything that talks to the zeepler API. To move the call behind your own
 * server (so the key never reaches a browser), replace this file and keep its
 * exports.
 *
 * Every call resolves to a `Result`; nothing here throws. Each failure the API
 * can actually return has its own `kind`, so the UI can say something useful.
 */

export const REGIONS = {
  us: { label: 'United States', baseUrl: 'https://api.zeepler.com' },
  ca: { label: 'Canada', baseUrl: 'https://api.ca.zeepler.com' },
} as const;

export interface Connection {
  apiKey: string;
  baseUrl: string;
}

export interface Account {
  plan: 'free' | 'card' | 'invoice';
  labelsThisMonth: number;
  /** The monthly label cap, or null when the account has none. */
  cap: number | null;
}

export type ApiError =
  /** 400: the body was refused. `errors[].field` is a path into it, e.g. `templates[2].dataPath`. */
  | { kind: 'invalid'; errors: { field: string; message: string }[] }
  /** 401: the key is missing, unknown or disabled. */
  | { kind: 'unauthorized'; message: string }
  /** 402: an account without a card has used its free labels for the month. */
  | { kind: 'capped'; message: string; dashboard: string }
  /** 429 from the per-key rate limit. Wait `retryAfter` seconds. */
  | { kind: 'rate-limited'; retryAfter: number }
  /** 429 from the account's own monthly spending limit. */
  | { kind: 'spending-limit'; currentSpend: number; limit: number }
  /** 5xx. A Lambda throttle reaches a caller as a 500 too, so retrying later is the answer to both. */
  | { kind: 'server' }
  /** The request never got an answer: offline, DNS, CORS, or the Content-Security-Policy. */
  | { kind: 'network' };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError };

const url = (connection: Connection, path: string) => `${connection.baseUrl.replace(/\/+$/, '')}${path}`;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback: number) => (typeof value === 'number' ? value : fallback);

/** Turn a refusal into an `ApiError`. */
async function toError(response: Response): Promise<ApiError> {
  if (response.status >= 500) return { kind: 'server' };
  const body = await readJson(response);
  switch (response.status) {
    case 400:
      return { kind: 'invalid', errors: Array.isArray(body.errors) ? body.errors : [] };
    case 401:
      return { kind: 'unauthorized', message: text(body.error, 'Invalid API key') };
    case 402:
      return {
        kind: 'capped',
        message: text(body.message, 'This month’s free labels are used.'),
        dashboard: text(body.dashboard, 'https://zeepler.com/dashboard'),
      };
    case 429:
      // The two 429s are told apart by the body. The browser cannot read the
      // Retry-After header (the API's CORS policy does not expose it), so the
      // wait comes from `retryAfter` in the body.
      if ('limit' in body) {
        return { kind: 'spending-limit', currentSpend: num(body.currentSpend, 0), limit: num(body.limit, 0) };
      }
      return { kind: 'rate-limited', retryAfter: num(body.retryAfter, 1) };
    default:
      return { kind: 'server' };
  }
}

async function send(connection: Connection, path: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url(connection, path), {
      ...init,
      headers: { ...init.headers, 'x-api-key': connection.apiKey },
      // The key is the only credential; never send cookies to the API.
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

/** `GET /v1/me`: check the key, and read the plan and this month's usage. Free: it generates nothing. */
export async function me(connection: Connection): Promise<Result<Account>> {
  const response = await send(connection, '/v1/me', { method: 'GET' });
  if (!response) return { ok: false, error: { kind: 'network' } };
  if (!response.ok) return { ok: false, error: await toError(response) };

  const body = await readJson(response);
  const plan = body.plan === 'card' || body.plan === 'invoice' ? body.plan : 'free';
  return {
    ok: true,
    value: {
      plan,
      labelsThisMonth: num(body.labelsThisMonth, 0),
      cap: typeof body.cap === 'number' ? body.cap : null,
    },
  };
}

/** `POST /v1/zeeplify`: turn a label request into ZPL. Each success is one label on the account. */
export async function zeeplify(connection: Connection, body: unknown): Promise<Result<string>> {
  const response = await send(connection, '/v1/zeeplify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response) return { ok: false, error: { kind: 'network' } };
  if (!response.ok) return { ok: false, error: await toError(response) };
  return { ok: true, value: await response.text() };
}

/** A sentence for an error, for anywhere that has nothing more specific to say. */
export function describeError(error: ApiError): string {
  switch (error.kind) {
    case 'invalid':
      return 'The API refused the label. Check the fields marked below.';
    case 'unauthorized':
      return `${error.message}. Check the key in Account above.`;
    case 'capped':
      return error.message;
    case 'rate-limited':
      return `Too many requests. Try again in ${error.retryAfter} second${error.retryAfter === 1 ? '' : 's'}.`;
    case 'spending-limit':
      return `This account has reached its monthly spending limit of $${error.limit}. Raise it in the dashboard.`;
    case 'server':
      return 'zeepler could not answer just now. Try again in a moment.';
    case 'network':
      return 'Could not reach the API. Check your connection, and the base URL if you set a custom one.';
  }
}
