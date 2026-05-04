# Zeroheight ↔ Locus-OS GitHub integration

This wires the Locus-OS design system into a hosted [Zeroheight][zh]
documentation site so the docs stay in lockstep with the code without
manual exports.

[zh]: https://zeroheight.com

```
   ┌─────────────────┐                ┌─────────────────────┐
   │   src/design/   │   ─ commit ─►  │  GitHub: Locus-OS   │
   │   tokens.ts     │                │  · tokens/*.json    │
   │   tokens.css    │                │  · src/design/*.tsx │
   │   *.stories.tsx │                │  · storybook-static │
   └─────────────────┘                └──────────┬──────────┘
                                                 │
                ┌────────────────────────────────┤
                │                                │
        Token Manager                    Component Sync
        (DTCG JSON ingest)               (Storybook URL + GitHub paths)
                │                                │
                └──────────────┬─────────────────┘
                               ▼
                       ┌───────────────┐
                       │  Zeroheight   │
                       │  hosted docs  │
                       └───────────────┘
```

## What gets synced

| In the repo                                | Becomes in Zeroheight                |
|--------------------------------------------|---------------------------------------|
| `tokens/locus.tokens.json`                 | Token Manager — colours, typography, dimension, duration, cubicBezier |
| `src/design/**/*.tsx`                       | Code blocks in component pages (live source) |
| `storybook-static/` published to Pages     | Live previews embedded in component pages |
| `docs/design-system/**/*.md`               | Usage guidelines, prose pages |

The **runtime source of truth** is `src/design/tokens.css`. The DTCG
JSON in `tokens/` is the publication artefact; `npm run tokens:lint`
keeps the two in sync (CI gate).

## One-time setup

### 1 · Connect the GitHub repo

In Zeroheight: **Settings → Integrations → GitHub → Add repository** →
authorise the GitHub App against this repository (`Locus-OS`). Grant
read access to:

- `tokens/**`
- `src/design/**`
- `docs/design-system/**`
- `storybook-static/**` (if you publish via the same repo)

No write access is required.

### 2 · Point the Token Manager at the DTCG file

Zeroheight: **Tokens → Manage tokens → Connect source → GitHub → DTCG**.

| Field          | Value                                    |
|----------------|------------------------------------------|
| Repository     | `Locus-OS`                               |
| Branch         | `main`                                   |
| File path      | `tokens/locus.tokens.json`               |
| Format         | W3C Design Tokens (DTCG)                 |
| Auto-sync      | On — every push to `main`                |

Zeroheight will pull the file on the next push and surface every
token under its `$type` group (Color / Font Family / Dimension /
Duration / Cubic Bezier).

### 3 · Connect components to source code

For each design-system component (`LotusCanvas`, `GlassModule`,
`EntityChip`, …), in Zeroheight create a component page and link it to
its source file via the **Component → Code → GitHub** pane:

| Component   | Source path                                      |
|-------------|--------------------------------------------------|
| LotusCanvas | `src/design/LotusCanvas.tsx`                     |
| GlassModule | `src/design/GlassModule.tsx`                     |
| EntityChip  | `src/design/EntityChip.tsx`                      |
| _next…_     | _add as components land_                         |

Zeroheight pulls the file on render and shows it as a syntax-highlighted
block. No manual paste/refresh needed.

### 4 · Embed the live Storybook previews

After Storybook is publishing to a public URL (see GitHub Action below),
in each component page → **Embed → Storybook** → paste the story URL,
e.g.

```
https://<your-org>.github.io/locus-os/iframe.html?id=design-system-glassmodule--default
```

Zeroheight renders an interactive iframe with the controls panel, so
designers can change props directly inside the docs.

## GitHub Action — publish Storybook to Pages

`.github/workflows/storybook.yml` builds Storybook on every push to
`main` and deploys `storybook-static/` to GitHub Pages. After the
first successful run the URL is
`https://<owner>.github.io/<repo>/`.

Enable Pages under **Settings → Pages → Build and deployment → Source:
GitHub Actions** before pushing.

## Editing tokens

1. Edit `src/design/tokens.css` (and the typed mirror at
   `src/design/tokens.ts` if you added/renamed/removed a token).
2. Mirror the change in `tokens/locus.tokens.json`.
3. Run `npm run tokens:lint` — must pass.
4. Commit. Zeroheight syncs on the next push.

## Editing components

1. Edit `src/design/<Component>.tsx` and its `*.stories.tsx`.
2. Run `npm run storybook` locally to verify visually.
3. Commit and push. The Storybook Pages build refreshes; Zeroheight
   pulls the next time someone loads the component page.

## Editing prose docs

`docs/design-system/*.md` is mirrored straight into Zeroheight as
content blocks. Markdown only (no front-matter parsing).
