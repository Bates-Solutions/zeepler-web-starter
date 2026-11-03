import { useMemo, useState } from 'react';
import AccountPanel from './components/AccountPanel';
import LabelForm from './components/LabelForm';
import { baseUrlFor, load, type Saved } from './account/storage';

export default function App() {
  const [saved, setSaved] = useState<Saved | null>(load);
  const connection = useMemo(
    () => (saved ? { apiKey: saved.apiKey, baseUrl: baseUrlFor(saved) } : null),
    [saved],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <h1 className="text-2xl font-semibold">zeepler web starter</h1>
          <p className="text-slate-700">
            Fill in a label, get ZPL back. A starting point for your own{' '}
            <a className="link" href="https://zeepler.com/documentation">
              zeepler
            </a>{' '}
            integration.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <AccountPanel saved={saved} onChange={setSaved} />
        <LabelForm connection={connection} />
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-sm text-slate-600">
        MIT licensed.{' '}
        <a className="link" href="https://github.com/Bates-Solutions/zeepler-web-starter">
          Source on GitHub
        </a>
        .
      </footer>
    </div>
  );
}
