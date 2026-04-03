import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export async function getFilesFromGit(): Promise<string[]> {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    console.error("Error: Not a git repository or no staged files");
    process.exit(2);
  }
}

export function readFileFromGit(filePath: string): string | null {
  try {
    return execSync(`git show :${filePath}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

export function readFileFromDisk(filePath: string, basePath: string): string | null {
  const fullPath = path.resolve(basePath, filePath);
  try {
    const stat = fs.statSync(fullPath);
    if (stat.size > 5 * 1024 * 1024) return null; // Skip files > 5MB
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}
