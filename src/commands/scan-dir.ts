import fs from "node:fs";
import path from "node:path";
import { scanContent, loadIgnorePatterns, shouldIgnore, type Finding } from "../scanner.js";
import { readFileFromDisk } from "../git.js";

function walkDir(dir: string, baseDir: string, ignorePatterns: string[]): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === "build") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, baseDir, ignorePatterns));
    } else {
      if (shouldIgnore(relPath, ignorePatterns)) continue;
      files.push(relPath);
    }
  }

  return files;
}

export async function scanDir(dirPath: string): Promise<Finding[]> {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: Path "${dirPath}" not found`);
    process.exit(2);
  }

  const findings: Finding[] = [];
  const stat = fs.statSync(resolved);

  // Handle single file
  if (stat.isFile()) {
    const baseDir = path.dirname(resolved);
    const fileName = path.basename(resolved);
    const ignorePatterns = loadIgnorePatterns(baseDir);
    if (shouldIgnore(fileName, ignorePatterns)) return findings;
    const content = readFileFromDisk(fileName, baseDir);
    if (content !== null) {
      findings.push(...scanContent(content, dirPath));
    }
    return findings;
  }

  const ignorePatterns = loadIgnorePatterns(resolved);
  const files = walkDir(resolved, resolved, ignorePatterns);

  for (const file of files) {
    // Skip binary files
    if (/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip|tar|gz|pdf|exe|dll|so|dylib|bin)$/i.test(file)) {
      continue;
    }

    const content = readFileFromDisk(file, resolved);
    if (content === null) continue;

    const fileFindings = scanContent(content, file);
    findings.push(...fileFindings);
  }

  return findings;
}
