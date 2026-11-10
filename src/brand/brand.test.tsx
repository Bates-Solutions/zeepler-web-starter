import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from '../App';

// Every link out to zeepler and Bates Solutions is tagged: the page sends no
// referrer, so the tags are how those sites count the visits it sends.
const tagged = /\?utm_source=github&utm_medium=demo&utm_campaign=starter$/;

describe('the branding', () => {
  it('links the zeepler logo in the header to zeepler.com', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    const logo = within(header).getByRole('img', { name: 'zeepler' }).closest('a')!;
    expect(logo.getAttribute('href')).toMatch(/^https:\/\/zeepler\.com\//);
    expect(logo.getAttribute('href')).toMatch(tagged);
  });

  it('credits Bates Solutions in the footer, linked to bates-solutions.com', () => {
    render(<App />);
    const footer = screen.getByRole('contentinfo');
    const logo = within(footer).getByRole('link', { name: 'Bates Solutions' });
    expect(logo.getAttribute('href')).toMatch(/^https:\/\/bates-solutions\.com\//);
    expect(logo.getAttribute('href')).toMatch(tagged);
  });

  it('tags every link to either site', () => {
    const { container } = render(<App />);
    const links = [...container.querySelectorAll('a')]
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => /^https:\/\/(zeepler|bates-solutions)\.com/.test(href));
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const href of links) expect(href).toMatch(tagged);
  });
});
