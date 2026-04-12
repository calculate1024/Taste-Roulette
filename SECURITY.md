# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Taste Roulette, please report it responsibly.

**Do NOT open a public GitHub Issue for security vulnerabilities.**

### How to Report

**Preferred: GitHub Private Vulnerability Reporting**

Open a private report via the repository's Security tab → "Report a vulnerability".
Direct link: <https://github.com/calculate1024/taste-roulette/security/advisories/new>

This is the recommended channel — it gives us a private, auditable thread, lets us
coordinate a fix through a [GitHub Security Advisory], and supports CVE assignment
if needed. (Same approach as `microsoft/vscode`, `vercel/next.js`, and `npm/cli`.)

[GitHub Security Advisory]: https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability

**Fallback: Email**

If you cannot use GitHub, email **security@taste-roulette.app** (or contact
@calculate1024 directly).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Step | SLA |
|------|-----|
| Acknowledgment | 3 business days |
| Initial assessment | 7 business days |
| Fix deployed | Severity-dependent (critical: 48h, high: 7d, medium: 30d) |

### Scope

**In scope:**
- Authentication and authorization flaws
- Data exposure (user emails, taste profiles, Spotify tokens)
- SQL injection, XSS, CSRF
- API endpoint security
- Supabase Row Level Security bypasses
- Expo push notification abuse

**Out of scope:**
- Denial of service attacks
- Social engineering
- Missing security headers on non-sensitive pages
- Vulnerabilities in third-party services (Spotify, Supabase, Vercel) — report these to the respective vendors
- Issues that require physical access to a user's device

### Legal Safe Harbor

We will not take legal action against researchers who:
- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or have explicit permission to test
- Report vulnerabilities to us before public disclosure
- Allow reasonable time for remediation before disclosure

### Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Previous releases | Best effort |

### Acknowledgments

We appreciate responsible disclosure and will credit reporters (with consent) in release notes.
