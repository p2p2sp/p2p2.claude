# Web performance lens
Audits what changes the bytes, their order or their timing in the browser: initial JavaScript weight, the largest-contentful-paint path, layout stability, hydration and interaction cost, asset weight and delivery headers. Server data-access latency belongs to the runtime performance lens, a wrong result, or a listener, timer or subscription never removed on unmount, to the bugs lens, an exploitable flaw to the security lens, and structure without a measurable cost to the design lens.

## Hunts
Every finding names a route, a byte count or an element, and the metric it affects.

### initial-js-weight
A heavy dependency reaching the entry chunk of a primary route: barrel (`export * from`) or whole-library imports; routes, modals, editors and charts imported statically; a `"use client"` root; legacy build targets or a whole `core-js` import; two libraries or two versions for one job. Per framework: Next `"use client"` in `layout.tsx`; Vite or Rollup putting all vendors in one chunk; Vue global component registration; Angular routes with `component:` instead of `loadComponent`; Astro `client:load` on a below-the-fold island.

### lcp-critical-path
An LCP element the HTML does not reveal early: `loading="lazy"` or no `fetchpriority` on the hero, a `next/image` hero with neither `preload` nor `fetchPriority="high"` (lazy by default), a hero rendered only on the client, render-blocking CSS or a sync `<script>` in `<head>`. Fetch waterfalls: a `useEffect` fetch chain, serial `await`s in a loader or server component, a blocking `await` in a root layout that stops streaming. HTML that could be static rendered per request: `cookies()`, `headers()`, `force-dynamic` or a `no-store` fetch in a shared layout; `getServerSideProps` for content with no per-user data.

### layout-stability
`img`, `video` or `iframe` without dimensions or `aspect-ratio`; ads, embeds or banners injected late with no reserved space, or a consent or promo banner inserted above existing content; font swap with no metric-matched fallback; client-only theme or locale branches flickering after hydration; a transition or keyframe animating `top`, `left`, `width`, `height` or `margin` instead of `transform`.

### interaction-hydration
Static content hydrated as client components or islands; a whole record or list serialized into the HTML as client props when the client reads a few fields; a render branching on `typeof window` or `matchMedia` (hydration mismatch, client re-render); a root context `value` rebuilt every render; a keystroke-driven re-render of a large non-virtualized list; a long synchronous handler with no yield, a layout read after a style write inside a loop, or a `scroll` or `pointermove` handler doing layout work per event.

### asset-and-delivery
Third-party tags loaded eagerly or in `<head>` (tag manager, chat, A/B testing, consent), and video, map or chat embeds with no facade; fonts not WOFF2, many weights or loaded by CSS `@import`; raw multi-MB images with no optimizer, or one large `src` with no `srcset` and `sizes`; hashed assets without a long `max-age` or `immutable`; HTML cached with a long `max-age`; back/forward cache blocked by an `unload` listener, an unconditional `beforeunload` or `Cache-Control: no-store` on HTML.

## Excluded
- Memoization or `useCallback` advice where React Compiler is enabled or the render is not shown to be expensive; loop and property-access micro-optimizations.
- Dev-only code: tests, Storybook, scripts, devDependencies, dev-server config.
- Imports already lazy, named ESM imports that tree-shake unless the build shows otherwise, and content below the fold for LCP and CLS claims (its code in the initial chunk still counts as initial JS).
- Images served by a framework optimizer (`next/image`, `astro:assets`, `@nuxt/image`), for format and compression only; their lazy loading, priority and `sizes` still count.
- Generic advice ("use a CDN") and any finding with no measurable claim.

## Verify
Worktree: required

Oracle: static evidence plus measurement from the production build. Never start a browser or a dev server.

1. Take the build command from the run file's `## Conventions`. In the clean worktree install with the lockfile, then build. No build command there: static evidence only, and a byte claim is capped at PARTIALLY VERIFIED.
2. Find the output directory: `dist/`, `build/`, `.next/` (HTML at `.next/server/app/<route>.html`; `/_next/` maps to `.next/`), `.output/public/`, `.svelte-kit/output/client/`, `dist/client/`, or the framework's static chunks directory.
3. Find the route's initial chunks. Generic: the targets of the `<script src>` and `<link rel="modulepreload">` or `<link rel="stylesheet">` tags in the built HTML of the route (locate the prerendered `.html` with `find`). Vite: the `isEntry` chunk of `.vite/manifest.json` plus a recursive walk of its `imports`, never `dynamicImports`. No prerendered HTML: the chunk holding a distinctive string of the library, plus an import chain from the route file with no dynamic `import()` boundary, gives PARTIALLY VERIFIED. A route claimed forced-dynamic is VERIFIED when no prerendered `.html` exists for it and removing the cited call is the only per-request input.
4. Measure each file with `gzip -9 -c FILE | wc -c` and sum per route.
5. Attribute: `grep -oE 'node_modules/(@[^/"]+/)?[^/"@]+' CHUNK.map | grep -v '/\.pnpm$' | sed 's#.*node_modules/##' | sort | uniq -c | sort -rn | head` (counts module paths, so presence, not bytes; size comes from step 4), or grep a distinctive library string inside the chunk.
6. Images and fonts: `du -k`; read dimensions with `file` only for PNG, JPEG and GIF, and judge WebP, AVIF and SVG by size alone.
7. Headers: read the configuration in the repository.

- VERIFIED: the dependency is in the initial set and the measured size is at least 30% of the claim, or the markup, header or handler defect is read in the repository (an LCP candidate, meaning the first large image or text block of the route's first viewport by markup order and declared size; a layout read after a style write inside a loop; a list rendered with no bound on N) and the implied fix removes it.
- PARTIALLY VERIFIED: real but smaller than claimed (state the measured size), or the capped case of step 1.
- REFUTED: the dependency is not in the initial set, the measured size is under 30% of the claim, or the code path is dead.
- INCONCLUSIVE: the build needs secrets, env vars or network beyond the package install, or fails; headers are set outside the repository (CDN, proxy); the claim is a measured duration or metric value (milliseconds of INP, the CLS score, which element the browser picks as LCP over a candidate) or depends on third-party tag content.

## Severity
- 9-10: by construction pushes a Core Web Vital of the main or landing route to "poor" (LCP over 4 s, INP over 500 ms, CLS over 0.25): a lazy or client-only hero behind 2 or more serial requests; over 1 MB gzipped initial JS.
- 7-8: likely moves a metric out of "good": over 100 KB gzipped added to a primary route's initial chunk; a sync third-party script in `<head>`; unsized media above the fold; a blocking `await` in a root layout; a forced reflow in a loop or an unvirtualized list over unbounded N on a primary interaction; a primary route forced dynamic.
- 4-6: the same on a secondary route; a bfcache blocker on every page; hashed assets with weak caching; non-WOFF2 or unsubset fonts; oversized images below the fold; a re-render cascade on a proven path.
- 1-3: under about 20 KB gzipped, admin-only routes, best-practice gaps with no measurable metric change.
