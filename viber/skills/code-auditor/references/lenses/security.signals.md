# Security lens map signals
Rank a unit higher when entry points and sinks co-occur, when its path is auth-shaped, or when it has a security-fix history; rank tests, fixtures, docs and vendored code lower.

Security-fix history, files touched by commits whose message names a security topic:
```bash
git -c core.quotePath=false log --no-merges -i -E --grep='secur|cve|vuln|xss|inject|auth|csrf|travers|saniti' --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Risky paths:
```bash
git -c core.quotePath=false ls-files -- '<scope>' | grep -iE 'auth|login|session|token|otp|mfa|passw|reset|crypto|admin|upload|webhook|payment|checkout|route|controller|handler|middleware' | head -50
```

Entry points:
```bash
git -c core.quotePath=false grep -c -E '@(app|router|bp)\.(get|post|put|delete|route)|(Get|Post|Request)Mapping|HandleFunc|router\.(get|post)|app\.(get|post|use)\(' -- '<scope>' | sort -t: -k2 -nr | head -30
```

Sinks:
```bash
git -c core.quotePath=false grep -c -E 'eval\(|exec\(|system\(|popen|shell=True|child_process|Runtime\.getRuntime|pickle\.loads|yaml\.load\(|unserialize\(|ObjectInputStream|innerHTML|dangerouslySetInnerHTML|v-html|mark_safe|bypassSecurityTrust|sendFile|urlopen|requests\.(get|post)' -- '<scope>' | sort -t: -k2 -nr | head -30
```

SQL built from strings:
```bash
git -c core.quotePath=false grep -n -E '(SELECT|INSERT|UPDATE|DELETE)[^;]*("|'"'"')[[:space:]]*(\+|%|\.format|\$\{)' -- '<scope>' | head -30
```

Crypto misuse:
```bash
git -c core.quotePath=false grep -n -i -E 'md5|sha1\(|ECB|Math\.random|verify=False|rejectUnauthorized:[[:space:]]*false|InsecureSkipVerify' -- '<scope>' | head -30
```

Secrets:
```bash
git -c core.quotePath=false grep -n -E 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{36}|(api_?key|secret|passw(or)?d|token)[[:space:]]*[:=][[:space:]]*("|'"'"')[^"'"'"']{12,}' -- '<scope>' | head -30
```

Diff scope only (run it only when the run file reads `Scope: diff`), lines removing a check in staged and unstaged edits; commits since the base are not covered:
```bash
git diff HEAD -- '<scope>' | grep -E '^-.*(auth|permission|valid|saniti|escape|verify)' | head -30
```
