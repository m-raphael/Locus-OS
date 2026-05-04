# tokens/

Canonical design-token export for **Zeroheight**.

`locus.tokens.json` is the W3C [Design Tokens Community Group][dtcg]
file that Zeroheight's GitHub integration ingests to populate the
hosted documentation. It is the *publication artefact* — the runtime
source of truth lives in `src/design/tokens.css` (CSS custom
properties) with a typed mirror at `src/design/tokens.ts`.

[dtcg]: https://design-tokens.github.io/community-group/format/

## Sync rule

Token values appear in three places:

| File | Role | Used by |
|---|---|---|
| `src/design/tokens.css` | runtime source | the app + Storybook (loaded once via `global.css`) |
| `src/design/tokens.ts` | typed mirror | TS code that needs numeric values (no CSS-var parsing) |
| `tokens/locus.tokens.json` | DTCG export | Zeroheight Token Manager via GitHub |

Edits to any one must be mirrored in the other two **in the same
commit**. CI runs `npm run tokens:lint` to spot-check that canonical
values agree across files; expand the `SPOT_CHECKS` array in
`scripts/export-design-tokens.mjs` whenever you add a new token group.

## Local check

```bash
npm run tokens:lint
```

Exits non-zero on any drift. Run before pushing token changes.

## Zeroheight integration

See [`docs/design-system/zeroheight-integration.md`](../docs/design-system/zeroheight-integration.md)
for the GitHub connection steps and the Storybook live-preview wiring.
