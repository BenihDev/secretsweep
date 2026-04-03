# secretsweep

Zero-config secret scanning for staged git files — catch API keys before you push.

## Install

```bash
npx @fanioz/secretsweep
```

Or install globally:

```bash
npm install -g @fanioz/secretsweep
```

## Usage

### Scan staged files (pre-commit friendly)

```bash
secretsweep
# or explicitly:
secretsweep staged
```

Scans only files staged in `git add` — perfect for pre-commit hooks.

### Scan a directory or file

```bash
secretsweep scan ./src
secretsweep scan ./config/production.json
```

### Use as a pre-commit hook

```bash
# .husky/pre-commit (or .git/hooks/pre-commit)
npx secretsweep staged
```

## What it detects

| Category | Patterns |
|---|---|
| **AWS** | Access Keys (AKIA...), Secret Keys |
| **GitHub** | Personal Access Tokens, OAuth, App Tokens |
| **GCP** | API Keys, OAuth tokens, Service Account keys |
| **Azure** | Connection Strings |
| **Stripe** | Secret and Publishable Keys |
| **Slack** | Bot tokens, Webhooks |
| **Database** | MongoDB, PostgreSQL, MySQL, Redis URIs |
| **Generic** | Bearer tokens, API keys, passwords, private keys |
| **Entropy** | High-entropy strings that look like secrets |

## Ignore false positives

Create a `.secretsweepignore` file:

```
# Ignore test fixtures
test/fixtures/
*.test.js
# Ignore specific files
examples/demo.js
```

## Why secretsweep?

Existing tools like gitleaks and truffleHog are powerful but enterprise-focused. secretsweep is:

- **Zero config** — works immediately, no setup files needed
- **Fast** — under 2 seconds for typical repos
- **Git-aware** — scans staged files by default, not your whole history
- **Focused** — catches secrets before they leave your machine

## License

MIT
