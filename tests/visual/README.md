# Theme regression tests

Two layers guard against dark tokens leaking back into light mode.

## 1. Token cascade tests (fast, CI-safe)

`src/test/theme-regression.test.ts` — runs with `npm test`.

- Replays the `src/index.css` cascade for every `mode x mood x brand`
  combination and asserts light-mode surfaces stay bright, foregrounds stay
  dark, and dark mode still resolves dark surfaces.
- Scans `src/**` for opaque hardcoded dark backgrounds and unscoped
  `text-white`.

No browser required.

## 2. Screenshot diffs (pixel level)

`scripts/theme-visual-regression.py` renders the deterministic specimen sheet at
`/__theme` (dev-only route, `src/pages/ThemeGallery.tsx`) for all 48
mode/mood/brand combinations and compares them with the baselines in
`tests/visual/baselines/`.

```bash
npm run dev                      # server must be running on :8080
npm run test:theme:visual        # verify against baselines
npm run test:theme:visual:update # accept intentional design changes
```

It fails when:

- more than 0.5% of pixels differ from the baseline (diffs written to
  `tests/visual/diffs/`), or
- a **light** screenshot has more than 12% dark pixels — the dark-token leak
  detector. For reference, a healthy light specimen sits around 0.4-2.6%, while
  a dark specimen is ~97%.

Requirements: Playwright (Chromium) and Pillow.

Baselines are committed; `actual/` and `diffs/` are ignored. Always eyeball the
diff images before running `--update`.
