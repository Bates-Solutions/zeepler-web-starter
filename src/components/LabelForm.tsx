import { useId, useRef, useState } from 'react';
import { describeError, zeeplify, type Connection } from '../api/zeepler';
import {
  buildRequest,
  checkValues,
  exampleValues,
  fieldForPath,
  FIELDS,
  type Values,
} from '../label/definition';
import ResultBox from './ResultBox';

export default function LabelForm({ connection }: { connection: Connection | null }) {
  const [values, setValues] = useState<Values>(exampleValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [zpl, setZpl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const inputId = (fieldId: string) => `${id}-${fieldId}`;

  const focusFirst = (found: Record<string, string>) => {
    const first = FIELDS.find((f) => found[f.id]);
    if (first) document.getElementById(inputId(first.id))?.focus();
  };

  const generate = async () => {
    if (!connection) return;
    const found = checkValues(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }

    const { body, fieldFor } = buildRequest(values);
    setBusy(true);
    const result = await zeeplify(connection, body);
    setBusy(false);

    if (result.ok) {
      setZpl(result.value);
      return;
    }
    setZpl(null);
    if (result.error.kind === 'invalid') {
      // Put each of the API's errors on the input it is about. One that names
      // no input (the size, say) can only come from a change to the
      // definition, so it is shown above the button with its path.
      const mapped: Record<string, string> = {};
      const unmapped: string[] = [];
      for (const { field, message } of result.error.errors) {
        const fieldId = fieldForPath(field, fieldFor);
        if (fieldId) mapped[fieldId] ??= `The API says this ${message}.`;
        else unmapped.push(`${field || 'body'} ${message}`);
      }
      setErrors(mapped);
      setFormError(
        unmapped.length
          ? `${describeError(result.error)} ${unmapped.join('; ')}.`
          : describeError(result.error),
      );
      focusFirst(mapped);
      return;
    }
    setFormError(describeError(result.error));
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
            {formError}
          </p>
          <button type="submit" className="btn-primary" disabled={!connection || busy}>
            {busy ? 'Generating…' : 'Generate ZPL'}
          </button>
        </div>
      </form>

      {zpl !== null && <ResultBox zpl={zpl} onAgain={() => void generate()} busy={busy} />}
    </section>
  );
}
