# Web performance lens map signals
Rank units by route reach (root layout first, then the landing page), then by the signals below and by churn. No frontend framework found in the repository by the first two blocks: `## Units` reads `none: <reason>`.

Framework config files:
```bash
git -c core.quotePath=false ls-files | grep -E '(^|/)(next|vite|nuxt|astro|svelte|remix|angular|webpack)\.(config\.)?(m?[jt]s|json)$'
```

Framework dependencies:
```bash
git -c core.quotePath=false grep -lE '"(react|vue|svelte|@angular/core|solid-js|preact)"' -- '*package.json'
```

Entry files:
```bash
git -c core.quotePath=false ls-files -- '<scope>' | grep -E '(^|/)(app/.*(page|layout)|pages/[^/]+|routes/.*|src/main|index)\.(t|j)sx?$|index\.html$'
```

Heavy imports:
```bash
git -c core.quotePath=false grep -nE "from ['\"](moment|lodash|@mui/icons-material|chart\.js|three|monaco-editor|xlsx|pdfjs-dist|highlight\.js|firebase|aws-sdk)['\"]|import \* as" -- '<scope>' | head -50
```

Client roots in layouts and providers:
```bash
git -c core.quotePath=false grep -lE "^['\"]use client['\"]" -- '<scope>' | grep -E 'layout|providers|_app'
```

Unsized media, line-based and approximate:
```bash
git -c core.quotePath=false grep -nE '<(img|iframe|video)[ >]' -- '<scope>' | grep -v 'width=' | head -50
```

Fetch waterfalls in effects:
```bash
git -c core.quotePath=false grep -nA4 'useEffect(' -- '<scope>' | grep -E 'fetch\(|axios|\.get\(' | head -50
```

Third-party tags and fonts:
```bash
git -c core.quotePath=false grep -nE 'googletagmanager|gtag|hotjar|intercom|beforeInteractive|fonts\.googleapis|@font-face|font-display' -- '<scope>' | head -50
```

Largest binaries:
```bash
git ls-files -z -- '<scope>/*.png' '<scope>/*.jpg' '<scope>/*.jpeg' '<scope>/*.gif' '<scope>/*.ttf' '<scope>/*.otf' | xargs -0 -I{} du -k {} | sort -rn | head -20
```

Cache headers in the repository:
```bash
git -c core.quotePath=false grep -nE 'Cache-Control|max-age|immutable' -- '<scope>/vercel.json' '<scope>/netlify.toml' '<scope>/_headers' '<scope>/next.config.*'
```

Churn:
```bash
git -c core.quotePath=false log --no-merges --since='6 months ago' --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```
