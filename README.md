# Fantasy Draft Assistant — Production Rewrite

A ground-up rewrite of the original single-file HTML tool, built the way a real team would build it:
React + TypeScript, a proper component architecture, centralized state, and a real test suite.

## What actually changed from the old version

| | Old version | This version |
|---|---|---|
| Language | Vanilla JS in one HTML file | TypeScript, ~30 focused files |
| UI | Hand-written `innerHTML` strings | React components |
| State | Global mutable variables | Centralized Zustand store |
| Tests | None | 90 automated tests on the core logic |
| CSV parsing | Hand-rolled `.split(',')` | PapaParse (handles quoted fields, edge cases) |
| Build | None — just open the file | Vite (dev server, optimized production build) |
| Linting/formatting | None | ESLint + Prettier |

## Project structure

```
src/
  types/           Core TypeScript types — the foundation everything else builds on
  lib/              Pure logic, zero UI dependencies — fully unit tested
    __tests__/      90 tests covering VBD math, name matching, lineup optimization,
                     source averaging, waiver suggestions, CSV processing, roster needs
  state/            Single Zustand store — the one source of truth for all app data
  components/
    shared/          Small reusable pieces (Badge, Pill)
    tabs/            One folder per tab, each split into focused subcomponents
electron/           Desktop app wrapper (loads the built React app, not a separate copy)
```

## Getting started

```bash
npm install
npm run dev
```

Opens the app in your browser with hot-reload — edit any file and see it update instantly.

## Running the tests

```bash
npm test
```

This runs the full suite covering VBD math, name matching (including a dedicated regression
test for the "James Cook II vs III" bug), the lineup optimizer's bye-week and slot-priority
logic, source averaging/deduplication, waiver suggestions, CSV row processing, and roster-needs
calculation.

## Building the Windows app

```bash
npm run build
npm run electron:build
```

The first command builds the optimized React app into `dist/`. The second packages it into a
real Windows installer via Electron — same as before, you'll find it in `electron-dist/`.

If you hit the same "Cannot create symbolic link" error from before: the `electron:build` script
already includes the fix (`CSC_IDENTITY_AUTO_DISCOVERY=false`) baked in, so it should just work
this time. If it still fails, run Command Prompt as Administrator and try again.

## Honest notes on verification

I want to be direct about what's actually been tested versus what's written-but-unexecuted,
since claiming untested code is tested would defeat the purpose of you asking for this rewrite.

**Genuinely verified — I compiled and ran this myself:**
- Every file in `src/lib/` and `src/types/` — clean TypeScript compile, zero errors
- All 90 tests in `src/lib/__tests__/` — executed and passing

**Written carefully, reviewed manually, but not executed by me:**
- The React components and the Zustand store. My sandbox has no internet access, so I couldn't
  install React's type declarations or Zustand itself to run a real compiler check against this
  layer. I did a full manual line-by-line review instead, and caught (and fixed) three real bugs
  this way: a type mismatch in the roster-needs logic, a duplicate import, and three places using
  `React.ChangeEvent` as a type without actually importing anything named `React`. Manual review
  is a weaker safety net than a compiler — it's very possible something smaller still slipped
  through. The first `npm run dev` on your machine, with real type-checking active, is the true
  first test of this layer.

**A known, deliberate limitation, not a bug:**
The lineup optimizer and waiver suggestions rank players by season-long average points, not
weekly matchup strength, unless you've imported real weekly projections for that specific week
(via the button on the Season tab). This was true in the original tool too — it's an accuracy
ceiling of the underlying data, not something the rewrite fixed or was meant to fix.

## A version-currency caveat

The exact package versions in `package.json` (React 19, Vite 6, Vitest 2, etc.) reflect what I
have reliable knowledge of as current. Several months may have passed by the time you run this —
if `npm install` complains about a specific version not existing, that package has likely had a
newer release; just remove the version pin for that one line (or run
`npm install <package>@latest`) and reinstall.
