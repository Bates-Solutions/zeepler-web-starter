# Contributing

Thanks for helping. This repo is reference code, so a change is judged first on whether it keeps
the code easy to read and to fork.

## Before you open a pull request

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build && npm run check:csp
```

CI runs the same checks on every pull request.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`,
`chore:` and so on. Releases are cut from them by semantic-release when a change reaches `main`.

## What fits

- Fixes, clearer code and comments, accessibility and test improvements.
- Keep the label in `src/label/definition.ts` and the API calls in `src/api/zeepler.ts`, so a
  forker still has one file for each.

## What does not fit

- **Printing or device handling.** The app stops at the ZPL; see the README's Where to go next.
- **A rendered label preview** that sends label content to a third-party service.
- **Third-party code at runtime:** analytics, fonts, CDNs.
- **Logging label content**, anywhere.

## Release check (maintainers)

Before a release is announced, run the live demo end to end with a real key. Read the key without
echoing it, so it stays out of your shell history:

```bash
npx playwright install chromium   # once
read -rs ZEEPLER_API_KEY && export ZEEPLER_API_KEY
npm run release-check
unset ZEEPLER_API_KEY
```

It opens https://bates-solutions.github.io/zeepler-web-starter/, checks the served CSP, saves the key,
runs Test connection and generates the example bin label, then checks the ZPL carries every field.
Set `ZEEPLER_REGION=ca` for a Canadian account, or `STARTER_URL` to check another copy.

- Each run uses one label from the account.
- It never runs in CI, and records nothing of the page: no trace, screenshot or video.
- Without `ZEEPLER_API_KEY` the test is skipped.

The test does not keep the ZPL, so check the printed label by hand: open the demo yourself, save the
key, Generate ZPL and Copy, then send it to a printer or paste it into a ZPL viewer. Check that nothing
overlaps or runs off the edge. This uses a second label.
