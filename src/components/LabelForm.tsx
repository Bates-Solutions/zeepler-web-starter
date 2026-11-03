import { useId, useRef, useState } from 'react';
import { describeError, zeeplify, type ApiError, type Connection } from '../api/zeepler';
import {
  buildRequest,
  checkValues,
  exampleValues,
  fieldForPath,
  FIELDS,
  type Values,
} from '../label/definition';
import ResultBox from './ResultBox';

/** The 402's dashboard link, shown only if it really is zeepler's: it comes from a response body. */
const dashboardLink = (error: ApiError) => {
  if (error.kind !== 'capped') return null;
  try {
    return new URL(error.dashboard).origin === 'https://zeepler.com' ? error.dashboard : null;
  } catch {
    return null;
  }
};

export default function LabelForm({ connection }: { connection: Connection | null }) {
  const [values, setValues] = useState<Values>(exampleValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ text: string; link?: string | null } | null>(null);
  // The ZPL, and the values it was made from, so it can say when the form has moved on.
  const [result, setResult] = useState<{ zpl: string; from: Values } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const inputId = (fieldId: string) => `${id}-${fieldId}`;

  const focusFirst = (found: Record<string, string>) => {
    const first = FIELDS.find((f) => found[f.id]);
    if (first) document.getElementById(inputId(first.id))?.focus();
  };

  const generate = async () => {
    if (!connection || busyRef.current) return;
    const found = checkValues(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }

    const { body, fieldFor } = buildRequest(values);
    busyRef.current = true;
    setBusy(true);
    const response = await zeeplify(connection, body);
    busyRef.current = false;
    setBusy(false);

    if (response.ok) {
      setResult({ zpl: response.value, from: values });
      return;
    }
    // The last good ZPL stays on screen: a failed Generate again should not
    // throw away a label that was fine, nor the button that has focus.
    if (response.error.kind === 'invalid') {
      // Put each of the API's errors on the input it is about. One that names
      // no input (the size, say) can only come from a change to the
      // definition, so it is shown above the button with its path.
      const mapped: Record<string, string> = {};
      const unmapped: string[] = [];
      for (const { field, message } of response.error.errors) {
        const fieldId = fieldForPath(field, fieldFor);
        if (fieldId) mapped[fieldId] ??= `The API says this ${message}.`;
        else unmapped.push(`${field || 'body'} ${message}`);
      }
      setErrors(mapped);
      setFormError({
        text: unmapped.length
          ? `${describeError(response.error)} ${unmapped.join('; ')}.`
          : describeError(response.error),
      });
      focusFirst(mapped);
      return;
    }
    setFormError({ text: describeError(response.error), link: dashboardLink(response.error) });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-slate-300 bg-white p-6">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-slate-900">
        Bin label, 4 × 2 in
      </h2>
      {!connection && <p className="mt-2 text-slate-700">Save an API key above to generate a label.</p>}

      <form
        ref={formRef}
        className="mt-4 grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        {FIELDS.map((field) => {
          const error = errors[field.id];
          const described = [field.hint && `${inputId(field.id)}-hint`, error && `${inputId(field.id)}-error`]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={field.id}>
              <label htmlFor={inputId(field.id)} className="block font-medium text-slate-900">
                {field.label}
                {!field.required && <span className="font-normal text-slate-600"> (optional)</span>}
              </label>
              {field.hint && (
                <p id={`${inputId(field.id)}-hint`} className="text-sm text-slate-600">
                  {field.hint}
                </p>
              )}
              <input
                id={inputId(field.id)}
                name={field.id}
                type={field.input === 'url' ? 'url' : 'text'}
                inputMode={field.input === 'integer' ? 'numeric' : field.input === 'url' ? 'url' : undefined}
                required={field.required}
                maxLength={field.maxLength}
                value={values[field.id] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                aria-invalid={error ? true : undefined}
                aria-describedby={described || undefined}
                className="input mt-1"
              />
              {error && (
                <p id={`${inputId(field.id)}-error`} className="field-error">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <div className="sm:col-span-2">
          <p role="alert" className="mb-3 text-sm text-red-800 empty:hidden">
            {formError?.text}
            {formError?.link && (
              <>
                {' '}
                <a className="link" href={formError.link}>
                  Open the dashboard
                </a>
              </>
            )}
          </p>
          {/* aria-disabled rather than disabled while busy, so the button keeps focus. */}
          <button
            type="submit"
            className="btn-primary"
            disabled={!connection}
            aria-disabled={busy || undefined}
          >
            {busy ? 'Generating…' : 'Generate ZPL'}
          </button>
        </div>
      </form>

      {result && (
        <ResultBox
          zpl={result.zpl}
          stale={FIELDS.some((f) => (result.from[f.id] ?? '') !== (values[f.id] ?? ''))}
          onAgain={connection ? () => void generate() : null}
          busy={busy}
        />
      )}
    </section>
  );
}
