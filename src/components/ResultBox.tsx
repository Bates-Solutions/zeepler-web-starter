import { useId, useRef, useState } from 'react';

export default function ResultBox({
  zpl,
  onAgain,
  busy,
}: {
  zpl: string;
  onAgain: () => void;
  busy: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(zpl);
      setCopied('Copied.');
    } catch {
      // No clipboard access (an insecure origin, or permission refused): select
      // it, so one keystroke copies it.
      area.current?.focus();
      area.current?.select();
      setCopied('Selected. Press Ctrl+C, or ⌘C on a Mac, to copy.');
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
      <textarea
        id={`${id}-zpl`}
        ref={area}
        readOnly
        rows={12}
        value={zpl}
        aria-describedby={`${id}-zpl-hint`}
        className="input mt-1 font-mono text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => void copy()}>
          Copy
        </button>
        <button type="button" className="btn-secondary" onClick={onAgain} disabled={busy}>
          Generate again
        </button>
        <span role="status" className="text-sm text-slate-700">
          {copied}
        </span>
      </div>
    </div>
  );
}
