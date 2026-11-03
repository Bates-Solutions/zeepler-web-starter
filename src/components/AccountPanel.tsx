import { useId, useState } from 'react';
import { me, describeError, REGIONS, type Account } from '../api/zeepler';
import { baseUrlFor, forget, mask, save, type Region, type Saved } from '../account/storage';

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

const describeAccount = (account: Account) => {
  const plan = { free: 'Free (no card)', card: 'Card', invoice: 'Invoice' }[account.plan];
  const usage =
    account.cap === null
      ? `${account.labelsThisMonth} labels this month`
      : `${account.labelsThisMonth} of ${account.cap} free labels used this month`;
  return `Connected. Plan: ${plan}. ${usage}.`;
};

/** Is this a base URL the app can call? Only https, and nothing after the host but a path. */
export const checkCustomUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return 'The base URL must start https://.';
    if (url.search || url.hash) return 'The base URL cannot carry a query or a fragment.';
    return null;
  } catch {
    return 'Enter a full base URL, for example https://yourname.api.zeepler.com.';
  }
};

export default function AccountPanel({
  saved,
  onChange,
}: {
  saved: Saved | null;
  onChange: (saved: Saved | null) => void;
}) {
  const [editing, setEditing] = useState(saved === null);
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState<Region>(saved?.region ?? 'us');
  const [customUrl, setCustomUrl] = useState(saved?.customUrl ?? '');
  const [remember, setRemember] = useState(saved?.remember ?? false);
  const [errors, setErrors] = useState<{ apiKey?: string; customUrl?: string }>({});
  const [status, setStatus] = useState<Status>(null);
  const [testing, setTesting] = useState(false);
  const id = useId();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    const key = apiKey.trim();
    if (!key) next.apiKey = 'Enter your API key.';
    else if (!key.startsWith('zpl_'))
      next.apiKey = 'An API key starts zpl_. Copy it from your zeepler dashboard.';
    if (region === 'custom') {
      const problem = checkCustomUrl(customUrl);
      if (problem) next.customUrl = problem;
    }
    setErrors(next);
    if (next.apiKey || next.customUrl) {
      document.getElementById(next.apiKey ? `${id}-key` : `${id}-url`)?.focus();
      return;
    }
    const value: Saved = { apiKey: key, region, customUrl: customUrl.trim(), remember };
    const stored = save(value);
    setApiKey('');
    setEditing(false);
    setStatus(
      stored
        ? { tone: 'info', text: remember ? 'Saved on this device.' : 'Saved until this tab closes.' }
        : {
            tone: 'info',
            text: 'This browser would not store the key, so it is kept only until the page reloads.',
          },
    );
    onChange(value);
  };

  const test = async () => {
    if (!saved) return;
    setTesting(true);
    setStatus({ tone: 'info', text: 'Checking…' });
    const result = await me({ apiKey: saved.apiKey, baseUrl: baseUrlFor(saved) });
    setTesting(false);
    setStatus(
      result.ok
        ? { tone: 'ok', text: describeAccount(result.value) }
        : { tone: 'error', text: describeError(result.error) },
    );
  };

  const forgetKey = () => {
    forget();
    setStatus({ tone: 'info', text: 'The key is forgotten on this device.' });
    setEditing(true);
    onChange(null);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-slate-300 bg-white p-6">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-slate-900">
        Account
      </h2>

      {!editing && saved ? (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-600">API key</dt>
            <dd className="font-mono">{mask(saved.apiKey)}</dd>
            <dt className="text-slate-600">API</dt>
            <dd className="break-all font-mono">{baseUrlFor(saved)}</dd>
          </dl>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={test} disabled={testing}>
              Test connection
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Replace key
            </button>
            <button type="button" className="btn-secondary" onClick={forgetKey}>
              Forget key
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor={`${id}-key`} className="block font-medium text-slate-900">
              API key
            </label>
            <p id={`${id}-key-hint`} className="text-sm text-slate-600">
              From your zeepler dashboard. It starts zpl_.
            </p>
            <input
              id={`${id}-key`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              aria-invalid={errors.apiKey ? true : undefined}
              aria-describedby={`${id}-key-hint${errors.apiKey ? ` ${id}-key-error` : ''}`}
              className="input mt-1 font-mono"
            />
            {errors.apiKey && (
              <p id={`${id}-key-error`} className="field-error">
                {errors.apiKey}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="font-medium text-slate-900">Region</legend>
            <p className="text-sm text-slate-600">The one your account was created in.</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {[
                ...Object.entries(REGIONS).map(([value, { label }]) => [value, label]),
                ['custom', 'Custom base URL'],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${id}-region`}
                    value={value}
                    checked={region === value}
                    onChange={() => setRegion(value as Region)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {region === 'custom' && (
            <div>
              <label htmlFor={`${id}-url`} className="block font-medium text-slate-900">
                Base URL
              </label>
              <p id={`${id}-url-hint`} className="text-sm text-slate-600">
                For a dedicated deployment. Its host must also be added to connect-src in index.html.
              </p>
              <input
                id={`${id}-url`}
                type="url"
                inputMode="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                aria-invalid={errors.customUrl ? true : undefined}
                aria-describedby={`${id}-url-hint${errors.customUrl ? ` ${id}-url-error` : ''}`}
                className="input mt-1 font-mono"
              />
              {errors.customUrl && (
                <p id={`${id}-url-error`} className="field-error">
                  {errors.customUrl}
                </p>
              )}
            </div>
          )}

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>
              Remember on this device
              <span className="block text-sm text-slate-600">
                Off, the key is forgotten when this tab closes. Leave it off on a shared computer.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary">
              Save key
            </button>
            {saved && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <p
        role="status"
        className={`mt-4 text-sm ${status?.tone === 'error' ? 'text-red-800' : status?.tone === 'ok' ? 'text-emerald-800' : 'text-slate-700'}`}
      >
        {status?.text}
      </p>
    </section>
  );
}
