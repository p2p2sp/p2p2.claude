# Security lens map signals
Rank a unit higher when entry points and sinks co-occur, when its path is auth-shaped, or when it has a security-fix history; rank tests, fixtures, docs and vendored code lower.

Security-fix history, files touched by commits whose message names a security topic:
```bash
git -c core.quotePath=false log --no-merges -i -E --grep='secur|cve|vuln|xss|inject|auth|csrf|travers|saniti|ssrf|idor|privilege|bypass|exploit' --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Risky paths:
```bash
git -c core.quotePath=false ls-files -- '<scope>' | grep -iE 'auth|login|session|token|otp|mfa|passw|reset|crypto|admin|upload|webhook|payment|checkout|route|controller|handler|middleware|oauth|sso|saml|jwt|permission|policy|acl|role|tenant|graphql|resolver|proxy|agent|prompt|mcp|\.github/workflows' | head -50
```

Entry points:
```bash
git -c core.quotePath=false grep -c -E '@(app|router|bp|api)\.(get|post|put|patch|delete|route)|@(Get|Post|Put|Patch|Delete|Request)Mapping|@(Get|Post|Put|Patch|Delete)\(|\[(Http(Get|Post|Put|Patch|Delete)|Route)|Map(Get|Post|Put|Patch|Delete)\(|HandleFunc|\.(GET|POST|PUT|PATCH|DELETE)\(|(router|app|mux|r|e|g)\.([Gg]et|[Pp]ost|[Pp]ut|[Pp]atch|[Dd]elete|[Uu]se|[Rr]oute|Handle)\(|Route::|#\[([Rr]oute|get|post|put|patch|delete)|urlpatterns|function (GET|POST|PUT|PATCH|DELETE)\(|use server' -- '<scope>' | sort -t: -k2 -nr | head -30
```

Sinks:
```bash
git -c core.quotePath=false grep -c -E 'eval\(|exec\(|system\(|popen|shell=True|child_process|Runtime\.getRuntime|ProcessBuilder|exec\.Command|Command::new|Process\.Start|shell_exec|passthru|proc_open|pickle\.loads|[Yy][Aa][Mm][Ll]\.load\(|Marshal\.load|BinaryFormatter|TypeNameHandling|enableDefaultTyping|unserialize\(|ObjectInputStream|innerHTML|dangerouslySetInnerHTML|v-html|mark_safe|html_safe|template\.HTML\(|\{@html|render_template_string|new Function\(|bypassSecurityTrust|sendFile|send_file|extractall|ZipEntry|urlopen|requests\.(get|post)|RestTemplate|WebClient|HttpClient|curl_exec|file_get_contents|Net::HTTP|reqwest' -- '<scope>' | sort -t: -k2 -nr | head -30
```

SQL built from strings:
```bash
git -c core.quotePath=false grep -n -E '(SELECT|INSERT|UPDATE|DELETE)[^;]*(("|'"'"')[[:space:]]*(\+|%|\.)|\$\{|#\{|\{[A-Za-z_]|%s|%v)|(raw|query|execute|createQuery|FromSqlRaw|QueryRawUnsafe)\((f"|`|\$"|"[^"]*"[[:space:]]*\+)' -- '<scope>' | head -30
```

Crypto misuse:
```bash
git -c core.quotePath=false grep -n -i -E 'md5\(|MD5\.|sha1\(|ECB|Math\.random|verify=False|rejectUnauthorized:[[:space:]]*false|InsecureSkipVerify|CERT_NONE|_create_unverified_context|NODE_TLS_REJECT_UNAUTHORIZED|SSL_VERIFYPEER|TrustAll|ServerCertificateValidationCallback|random\.(random|randint|choice)|mt_rand|new Random\(|math/rand|algorithms=.*none|verify_signature.*False|ignoreExpiration|jwt\.decode\(' -- '<scope>' | head -30
```

Secrets:
```bash
git -c core.quotePath=false grep -n -i -E 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{36}|github_pat_|xox[abposr]-|sk_live_|sk-ant-|AIza[0-9A-Za-z_-]{35}|(api_?key|secret|passw(or)?d|token)[[:space:]]*[:=][[:space:]]*("|'"'"')[^"'"'"'$<{%][^"'"'"']{11,}' -- '<scope>' ':!*.lock' ':!*lock.json' | head -30
```

Models and agent wiring:
```bash
git -c core.quotePath=false grep -c -i -E 'openai|anthropic|langchain|llamaindex|generativeai|messages\.create|chat\.completions|tool_choice|function_call|allowed-?tools|mcp' -- '<scope>' | sort -t: -k2 -nr | head -30
```
