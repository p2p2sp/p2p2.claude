# Web performance lens
Audits what changes the bytes, their order or their timing in the browser: initial JavaScript weight, the largest-contentful-paint path, layout stability, hydration and interaction cost, asset weight and delivery headers. Server data-access latency belongs to the runtime performance lens, a wrong result to the bugs lens, an exploitable flaw to the security lens, and structure without a measurable cost to the design lens.

## Hunts
Order of impact: waterfalls and bundle size first, micro-optimizations last. Every finding names a route, a byte count or an element, and the metric it affects.

### initial-js-weight
A heavy dependency reaching the entry chunk of a primary route: barrel or `import *` imports, no lazy split for modals, editors and charts, a `"use client"` root, polyfills. Per framework: Next `"use client"` in `layout.tsx`; Vite or Rollup putting all vendors in one chunk; Vue global component registration; Angular routes without `loadComponent`.

### lcp-critical-path
An LCP element the HTML does not reveal early: `loading="lazy"` or no `fetchpriority` on the hero, a hero rendered only on the client, render-blocking CSS or a sync `<script>` in `<head>`. Fetch waterfalls: a `useEffect` fetch chain, serial `await`s in a loader or server component, a blocking `await` in a root layout that stops streaming.

### layout-stability
`img`, `video` or `iframe` without dimensions or `aspect-ratio`; ads, embeds or banners injected late with no reserved space; font swap with no metric-matched fallback; client-only theme or locale branches flickering after hydration.

### interaction-hydration
Static content hydrated as client components; a root context `value` rebuilt every render; a keystroke-driven re-render of a large non-virtualized list; long synchronous handlers or DOM read-after-write (layout thrash).

### asset-and-delivery
Third-party tags loaded eagerly or in `<head>` (tag manager, chat, A/B testing); fonts not WOFF2, many weights or loaded by CSS `@import`; raw multi-MB images with no optimizer; hashed assets without a long `max-age` or `immutable`; HTML cached with a long `max-age`.

## Excluded
- Memoization or `useCallback` advice where React Compiler is enabled or the render is not shown to be expensive; loop and property-access micro-optimizations.
- Dev-only code: tests, Storybook, scripts, devDependencies, dev-server config.
- Server data-access latency (database, API): the runtime performance lens.
- Imports already lazy, content below the fold, named ESM imports that tree-shake unless the build shows otherwise.
- Images handled by the framework optimizer (`next/image`, `astro:assets`, `@nuxt/image`), flagged only for format.
- Generic advice ("use a CDN") and any finding with no measurable claim.

## Verify
Worktree: required

Oracle: static evidence plus measurement from the production build. Never start a browser or a dev server.

1. Take the build command from the run file's `## Conventions`. In the clean worktree install with the lockfile, then build. No build command there: static evidence only, and the verdict is capped at PARTIALLY VERIFIED.
2. Find the output directory: `dist/`, `build/`, `.output/public/`, `.svelte-kit/output/client/`, `dist/client/`, or the framework's static chunks directory.
3. Find the route's initial chunks. Generic: the targets of the `<script src>` and `<link rel="modulepreload">` or `<link rel="stylesheet">` tags in the built HTML of the route (locate the prerendered `.html` with `find`). Vite: the `isEntry` chunk of `.vite/manifest.json` plus a recursive walk of its `imports`, never `dynamicImports`.
4. Measure each file with `gzip -9 -c FILE | wc -c` and sum per route.
5. Attribute: `grep -o 'node_modules/[^/"]*' CHUNK.map | sort | uniq -c`, or grep a distinctive library string inside the chunk.
6. Images and fonts: `du -k`; read dimensions with `file` only for PNG, JPEG and GIF, and judge WebP, AVIF and SVG by size alone.
7. Headers: read the configuration in the repository.

- VERIFIED: the dependency is in the initial set and the measured size is at least 30% of the claim, or the markup or header defect is read in the repository and the implied fix removes it.
- PARTIALLY VERIFIED: real but smaller than claimed (state the measured size), or the capped case of step 1.
- REFUTED: the dependency is not in the initial set, the measured size is under 30% of the claim, or the code path is dead.
- INCONCLUSIVE: the build needs secrets, env vars or network beyond the package install, or fails; the route is dynamic so no HTML is prerendered; headers are set outside the repository (CDN, proxy); the claim depends on runtime facts (which element is the LCP, INP under real interaction, third-party tag content).

## Severity
- 9-10: by construction pushes a Core Web Vital of the main or landing route to "poor" (LCP over 4 s, INP over 500 ms, CLS over 0.25): a lazy or client-only hero behind 2 or more serial requests; over 1 MB gzipped initial JS.
- 7-8: likely moves a metric out of "good": over 100 KB gzipped added to a primary route's initial chunk; a sync third-party script in `<head>`; unsized media above the fold; a blocking `await` in a root layout.
- 4-6: the same on a secondary route; hashed assets with weak caching; non-WOFF2 or unsubset fonts; oversized images below the fold; a re-render cascade on a proven path.
- 1-3: under about 20 KB gzipped, admin-only routes, best-practice gaps with no measurable metric change.
