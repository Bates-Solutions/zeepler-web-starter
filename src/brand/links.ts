/**
 * Links to zeepler and Bates Solutions, with campaign tags so each site can
 * count the visits this starter sends it (zeepler's tag rules are in its
 * docs/marketing/utm.md). The page sends no referrer, so the tags are the only
 * way a visit is attributed.
 *
 * In your own copy, change or remove these along with the logos in this folder.
 */
const tag = (url: string, medium: 'demo' | 'readme') =>
  `${url}?utm_source=github&utm_medium=${medium}&utm_campaign=starter`;

export const ZEEPLER_URL = tag('https://zeepler.com/', 'demo');
export const ZEEPLER_DOCS_URL = tag('https://zeepler.com/documentation', 'demo');
export const BATES_URL = tag('https://bates-solutions.com/', 'demo');
