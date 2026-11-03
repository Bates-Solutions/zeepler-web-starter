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
