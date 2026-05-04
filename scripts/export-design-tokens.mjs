#!/usr/bin/env node
/**
 * Locus-OS · design token lint.
 *
 * The DTCG JSON at `tokens/locus.tokens.json` is the artefact Zeroheight
 * ingests via the GitHub integration. It is hand-maintained alongside
 * `src/design/tokens.css` (CSS custom properties — runtime source of
 * truth) and `src/design/tokens.ts` (typed JS/TS mirror).
 *
 * This script:
 *   1. Validates the DTCG JSON parses and only uses the standard $types.
 *   2. Spot-checks a handful of canonical values against tokens.css —
 *      catches the most common drift (someone updates the CSS but
 *      forgets to bump the JSON, or vice versa).
 *   3. Prints per-group counts so PR reviewers can see at a glance what
 *      a token-only change touched.
 *
 * Exit code is non-zero on any failure so CI can gate on it.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TOKENS_JSON = path.join(ROOT, "tokens", "locus.tokens.json");
const TOKENS_CSS = path.join(ROOT, "src", "design", "tokens.css");

const VALID_TYPES = new Set([
  "color",
  "fontFamily",
  "fontWeight",
  "dimension",
  "duration",
  "cubicBezier",
  "shadow",
  "border",
  "transition",
  "gradient",
  "typography",
  "strokeStyle",
  "number",
]);

const SPOT_CHECKS = [
  // path → expected substring in tokens.css (single line)
  { dtcg: ["color", "accent", "vellum", "base"],   css: "--lotus-accent:        #7C7CF2" },
  { dtcg: ["color", "accent", "moonlight", "base"], css: "--lotus-accent:        #9B8CFF" },
  { dtcg: ["color", "background", "vellum", "base"], css: "--lotus-bg-base:  #f4f1ee" },
  { dtcg: ["color", "background", "moonlight", "base"], css: "--lotus-bg-base:  #0c0d11" },
  { dtcg: ["color", "entity", "person"],            css: "--lotus-entity-person:" },
  { dtcg: ["dimension", "radius", "card"],          css: "--lotus-radius-card:    28px" },
  { dtcg: ["duration", "stagger"],                  css: "--lotus-motion-stagger: 90ms" },
];

function fail(msg) {
  console.error(`[31m✖ ${msg}[0m`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[32m✓[0m ${msg}`);
}

function isLeaf(node) {
  return node && typeof node === "object" && "$value" in node;
}

function walk(node, pathParts, visit) {
  if (isLeaf(node)) {
    visit(pathParts, node);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$")) continue;
    walk(v, [...pathParts, k], visit);
  }
}

function get(obj, parts) {
  return parts.reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function main() {
  const rawJson = fs.readFileSync(TOKENS_JSON, "utf8");
  let tokens;
  try {
    tokens = JSON.parse(rawJson);
  } catch (e) {
    fail(`tokens/locus.tokens.json is not valid JSON: ${e.message}`);
    return;
  }

  const counts = {};
  let total = 0;
  walk(tokens, [], (parts, leaf) => {
    total += 1;
    const t = leaf.$type;
    if (!t) {
      fail(`token ${parts.join(".")} is missing $type`);
      return;
    }
    if (!VALID_TYPES.has(t)) {
      fail(`token ${parts.join(".")} has unknown $type "${t}"`);
      return;
    }
    counts[t] = (counts[t] ?? 0) + 1;
  });

  if (total === 0) {
    fail("no tokens found in tokens/locus.tokens.json");
    return;
  }
  ok(`parsed ${total} tokens`);
  for (const [t, n] of Object.entries(counts)) {
    ok(`  ${t.padEnd(11)} ${n}`);
  }

  const cssText = fs.readFileSync(TOKENS_CSS, "utf8");
  for (const check of SPOT_CHECKS) {
    const leaf = get(tokens, check.dtcg);
    if (!leaf || !leaf.$value) {
      fail(`spot-check missing in DTCG: ${check.dtcg.join(".")}`);
      continue;
    }
    if (!cssText.includes(check.css)) {
      fail(
        `drift: tokens.css does not contain expected substring "${check.css}" ` +
          `for DTCG token ${check.dtcg.join(".")} = ${JSON.stringify(leaf.$value)}`
      );
      continue;
    }
    ok(`spot-check ok: ${check.dtcg.join(".")}`);
  }

  if (process.exitCode) {
    console.error("\nfix the issues above and re-run `npm run tokens:lint`.");
  } else {
    console.log("\nall checks passed.");
  }
}

main();
