import { useId, useRef, useState } from 'react';

export default function ResultBox({
  zpl,
  stale,
  onAgain,
  busy,
}: {
  zpl: string;
  /** The form has changed since this ZPL was made. */
  stale: boolean;
  /** Null when there is no key to generate with. */
  onAgain: (() => void) | null;
  busy: boolean;
}) {
  // Which ZPL the message is about, so new ZPL from Generate again is never
  // shown as already copied.
  const [copied, setCopied] = useState<{ zpl: string; text: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(zpl);
      setCopied({ zpl, text: 'Copied.' });
    } catch {
      // No clipboard access (an insecure origin, or permission refused): select
      // it, so one keystroke copies it.
      area.current?.focus();
      area.current?.select();
      setCopied({ zpl, text: 'Selected. Press Ctrl+C, or ⌘C on a Mac, to copy.' });
    }
  };

  return (
    <div className="mt-6">
      <label htmlFor={`${id}-zpl`} className="block font-medium text-slate-900">
        ZPL
      </label>
      <p id={`${id}-zpl-hint`} className="text-sm text-slate-600">
        Send this to a Zebra printer at 203 dpi, loaded with 4 × 2 in labels.
      </p>
      {stale && (
        <p id={`${id}-zpl-stale`} className="mt-1 text-sm font-medium text-amber-900">
          This ZPL is from before your latest changes to the form. Generate again to update it.
        </p>
      )}
      <textarea
        id={`${id}-zpl`}
        ref={area}
        readOnly
        rows={12}
        value={zpl}
        aria-describedby={`${id}-zpl-hint${stale ? ` ${id}-zpl-stale` : ''}`}
        className="input mt-1 font-mono text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => void copy()}>
          Copy
        </button>
        {onAgain && (
          <button type="button" className="btn-secondary" onClick={onAgain} aria-disabled={busy || undefined}>
            {busy ? 'Generating…' : 'Generate again'}
          </button>
        )}
        <span role="status" className="text-sm text-slate-700">
          {copied?.zpl === zpl ? copied.text : null}
        </span>
      </div>
    </div>
  );
}
