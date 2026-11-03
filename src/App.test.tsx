import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import App from './App';

const fetchMock = vi.fn();
const reply = (status: number, body: unknown, type = 'application/json') =>
  fetchMock.mockResolvedValueOnce(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': type },
    }),
  );

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

async function saveKey(user: ReturnType<typeof userEvent.setup>, key = 'zpl_abcdefgh1234') {
  await user.type(screen.getByLabelText('API key'), key);
  await user.click(screen.getByRole('button', { name: 'Save key' }));
}

// jsdom cannot lay out or paint, so colour contrast is not checked here.
async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

describe('the app', () => {
  it('has no accessibility violations, before and after a key is saved', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await expectNoAxeViolations(container);
    await saveKey(user);
    await expectNoAxeViolations(container);
  });

  it('will not generate until a key is saved', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Generate ZPL' })).toBeDisabled();
  });

  it('refuses a key that is not a zeepler key, on the input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user, 'sk_live_123');
    const input = screen.getByLabelText('API key');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/An API key starts zpl_/);
    expect(input).toHaveFocus();
  });

  it('masks a saved key, and forgets it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    expect(screen.getByText('zpl_…1234')).toBeInTheDocument();
    expect(screen.queryByText('zpl_abcdefgh1234')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Forget key' }));
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('tests the connection with GET /v1/me, and reports the plan and usage', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, { plan: 'free', labelsThisMonth: 3, cap: 10 });

    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    expect(
      await screen.findByText('Connected. Plan: Free (no card). 3 of 10 free labels used this month.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.zeepler.com/v1/me');
  });

  it('generates a label from the example values and shows the ZPL to copy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^FDHex bolt^FS^XZ', 'text/plain');

    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    expect(await screen.findByLabelText('ZPL')).toHaveValue('^XA^FDHex bolt^FS^XZ');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.zeepler.com/v1/zeeplify');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('checks the form before calling the API, and links each error to its input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    await user.clear(screen.getByLabelText('Item name'));
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), 'ten');

    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Item name')).toHaveAccessibleDescription('Item name is required.');
    expect(screen.getByLabelText('Quantity')).toHaveAccessibleDescription('Quantity must be a whole number.');
    expect(screen.getByLabelText('Item name')).toHaveFocus();
  });

  it("puts the API's 400 errors on the inputs they are about", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(400, {
      errors: [{ field: 'templates[2].dataPath', message: 'must name a string or number in data' }],
    });

    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    expect(
      await screen.findByText('The API says this must name a string or number in data.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('SKU', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the free-cap message from a 402', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(402, {
      message: 'An account without a card can generate 10 labels a month.',
      dashboard: 'https://zeepler.com/dashboard',
    });

    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/10 labels a month/)).toBeInTheDocument();
  });

  it('copies the ZPL, or selects it when the clipboard is refused', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await screen.findByLabelText('ZPL');

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('Copied.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe('^XA^XZ');

    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText(/Press Ctrl\+C/)).toBeInTheDocument();
    expect(screen.getByLabelText('ZPL')).toHaveFocus();
  });

  it('keeps focus somewhere sensible as the account panel switches views', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    expect(screen.getByRole('button', { name: 'Test connection' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Replace key' }));
    expect(screen.getByLabelText('API key')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Replace key' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Forget key' }));
    expect(screen.getByLabelText('API key')).toHaveFocus();
  });

  it('ignores a connection test that answers after the key was forgotten', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    let answer!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));

    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    await user.click(screen.getByRole('button', { name: 'Forget key' }));
    answer(new Response(JSON.stringify({ plan: 'free', labelsThisMonth: 1, cap: 10 }), { status: 200 }));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText(/Connected/)).not.toBeInTheDocument();
    expect(screen.getByText('The key is forgotten on this device.')).toBeInTheDocument();
  });

  it('links the dashboard from a 402, but only zeepler’s', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(402, { message: 'Free labels used.', dashboard: 'https://zeepler.com/dashboard' });
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    expect(await screen.findByRole('link', { name: 'Open the dashboard' })).toHaveAttribute(
      'href',
      'https://zeepler.com/dashboard',
    );

    reply(402, { message: 'Free labels used.', dashboard: 'https://evil.example/dashboard' });
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await screen.findByText('Free labels used.');
    expect(screen.queryByRole('link', { name: 'Open the dashboard' })).not.toBeInTheDocument();
  });

  it('keeps the last good ZPL, and focus, when Generate again fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await screen.findByLabelText('ZPL');

    reply(500, { error: 'Internal error' });
    await user.click(screen.getByRole('button', { name: 'Generate again' }));

    expect(await screen.findByText(/could not answer just now/)).toBeInTheDocument();
    expect(screen.getByLabelText('ZPL')).toHaveValue('^XA^XZ');
    expect(screen.getByRole('button', { name: 'Generate again' })).toHaveFocus();
  });

  it('does not show new ZPL as already copied', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^FDone^FS^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await user.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('Copied.')).toBeInTheDocument();

    reply(200, '^XA^FDtwo^FS^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate again' }));
    expect(await screen.findByDisplayValue('^XA^FDtwo^FS^XZ')).toBeInTheDocument();
    expect(screen.queryByText('Copied.')).not.toBeInTheDocument();
  });

  it('offers no Generate again once the key is forgotten', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await screen.findByLabelText('ZPL');

    await user.click(screen.getByRole('button', { name: 'Forget key' }));
    expect(screen.queryByRole('button', { name: 'Generate again' })).not.toBeInTheDocument();
  });

  it('says when the ZPL on screen no longer matches the form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    const zpl = await screen.findByLabelText('ZPL');
    expect(screen.queryByText(/from before your latest changes/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('SKU', { exact: false }), '-2');
    reply(429, { error: 'Rate limit exceeded', retryAfter: 2 });
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    await screen.findByText(/Try again in 2 seconds/);
    expect(zpl).toHaveAccessibleDescription(/from before your latest changes/);
  });

  it('warns on Copy too when the ZPL is stale, but not for a trailing space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    reply(200, '^XA^XZ', 'text/plain');
    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));
    await screen.findByLabelText('ZPL');

    await user.type(screen.getByLabelText('Item name'), ' ');
    expect(screen.queryByText(/from before your latest changes/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Item name'), 'X');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveAccessibleDescription(
      /from before your latest changes/,
    );
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('Copied, but it is from before your latest changes.')).toBeInTheDocument();
  });

  it('recovers when the ZPL body never arrives', async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveKey(user);
    const broken = new Response('^XA^XZ', { status: 200 });
    vi.spyOn(broken, 'text').mockRejectedValue(new TypeError('network error'));
    fetchMock.mockResolvedValueOnce(broken);

    await user.click(screen.getByRole('button', { name: 'Generate ZPL' }));

    expect(await screen.findByText(/Could not reach the API/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate ZPL' })).not.toHaveAttribute('aria-disabled');
  });
});
