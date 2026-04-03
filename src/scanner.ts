import fs from "node:fs";
import path from "node:path";

export interface Finding {
  file: string;
  line: number;
  type: string;
  match: string;
}

const PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  // AWS
  { type: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/g },
  { type: "AWS Secret Key", pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g },
  // GitHub
  { type: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { type: "GitHub OAuth", pattern: /gho_[A-Za-z0-9_]{36,}/g },
  { type: "GitHub App Token", pattern: /ghs_[A-Za-z0-9_]{36,}/g },
  // Generic API keys
  { type: "Slack Token", pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  { type: "Slack Webhook", pattern: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[a-zA-Z0-9]+/g },
  { type: "Stripe Secret Key", pattern: /sk_live_[0-9a-zA-Z]{24,}/g },
  { type: "Stripe Publishable Key", pattern: /pk_live_[0-9a-zA-Z]{24,}/g },
  { type: "Twilio API Key", pattern: /SK[0-9a-fA-F]{32}/g },
  { type: "SendGrid API Key", pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g },
  // Cloud providers
  { type: "Google API Key", pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { type: "Google OAuth", pattern: /[0-9]+-[a-z0-9_]{32}\.apps\.googleusercontent\.com/g },
  { type: "GCP Service Account", pattern: /"type":\s*"service_account"/g },
  // Private keys
  { type: "RSA Private Key", pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: "SSH Private Key", pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g },
  // Database
  { type: "MongoDB URI", pattern: /mongodb(?:\+srv)?:\/\/[^$\s]+:[^$\s]+@[^\s]+/g },
  { type: "PostgreSQL URI", pattern: /postgres(?:ql)?:\/\/[^$\s]+:[^$\s]+@[^\s]+/g },
  { type: "MySQL URI", pattern: /mysql:\/\/[^$\s]+:[^$\s]+@[^\s]+/g },
  { type: "Redis URI", pattern: /redis:\/\/[^$\s]+:[^$\s]+@[^\s]+/g },
  // Generic secrets
  { type: "Bearer Token", pattern: /Bearer [a-zA-Z0-9_\-\.]{20,}/g },
  { type: "Auth Token", pattern: /["']?token["']?\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{20,}["']/gi },
  { type: "API Key (generic)", pattern: /["']?api[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{20,}["']/gi },
  { type: "Secret Key", pattern: /["']?secret[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{20,}["']/gi },
  { type: "Password Assignment", pattern: /["']?password["']?\s*[:=]\s*["'][^"']{8,}["']/gi },
  // Cloud-specific
  { type: "Azure Connection String", pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[^;]+/g },
  { type: "Heroku API Key", pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g },
];

function shannonEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function scanContent(content: string, filePath: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  // Pattern matching
  for (const { type, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        findings.push({
          file: filePath,
          line: i + 1,
          type,
          match: match[0].trim(),
        });
      }
    }
  }

  // Entropy analysis on string-like values
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const valueMatch = line.match(/["'`](["'`])([^"'` ]{20,})\1|["']([A-Za-z0-9+/=_-]{20,})["']/g);
    if (valueMatch) {
      for (const m of valueMatch) {
        const val = m.replace(/^["'`]+|["'`]+$/g, "");
        if (shannonEntropy(val) >= 4.5 && val.length >= 20) {
          const alreadyFound = findings.some(
            (f) => f.line === i + 1 && f.match === m.trim()
          );
          if (!alreadyFound) {
            findings.push({
              file: filePath,
              line: i + 1,
              type: "High-entropy string",
              match: m.trim(),
            });
          }
        }
      }
    }
  }

  return findings;
}

export function loadIgnorePatterns(dir: string): string[] {
  const patterns: string[] = [];
  const ignorePath = path.join(dir, ".secretsweepignore");
  if (fs.existsSync(ignorePath)) {
    const content = fs.readFileSync(ignorePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        patterns.push(trimmed);
      }
    }
  }
  return patterns;
}

export function shouldIgnore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith("/")) {
      if (filePath.startsWith(pattern)) return true;
    } else if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      if (regex.test(filePath)) return true;
    } else if (filePath.endsWith(pattern) || filePath === pattern) {
      return true;
    }
  }
  return false;
}
