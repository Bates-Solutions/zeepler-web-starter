import { useMemo, useState } from 'react';
import AccountPanel from './components/AccountPanel';
import LabelForm from './components/LabelForm';
import { baseUrlFor, load, type Saved } from './account/storage';
import { BATES_URL, ZEEPLER_DOCS_URL, ZEEPLER_URL } from './brand/links';
import zeeplerMark from './brand/zeepler-mark.svg';
import batesLogo from './brand/bates-solutions.svg';

export default function App() {
  const [saved, setSaved] = useState<Saved | null>(load);
  const connection = useMemo(
    () => (saved ? { apiKey: saved.apiKey, baseUrl: baseUrlFor(saved) } : null),
    [saved],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-3xl items-start gap-4 px-4 py-5">
          <a href={ZEEPLER_URL} className="shrink-0">
            <img src={zeeplerMark} alt="zeepler" width="48" height="48" />
          </a>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">zeepler web starter</h1>
            <p className="text-slate-700">
              Fill in a label, get ZPL back. A starting point for your own integration with the{' '}
              <a className="link" href={ZEEPLER_DOCS_URL}>
                zeepler API
              </a>
              .
            </p>
          </div>
          <a className="btn-secondary hidden shrink-0 sm:inline-block" href={ZEEPLER_URL}>
            zeepler.com
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <AccountPanel saved={saved} onChange={setSaved} />
        <LabelForm connection={connection} />
      </main>
      <footer className="mx-auto max-w-3xl space-y-3 border-t border-slate-300 px-4 pt-6 pb-10 text-sm text-slate-600">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span>Built by</span>
          <a href={BATES_URL}>
            <img src={batesLogo} alt="Bates Solutions" width="160" height="40" />
          </a>
          <span>
            the makers of{' '}
            <a className="link" href={ZEEPLER_URL}>
              zeepler
            </a>
            .
          </span>
        </p>
        <p>
          MIT licensed.{' '}
          <a className="link" href="https://github.com/Bates-Solutions/zeepler-web-starter">
            Source on GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
