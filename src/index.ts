#!/usr/bin/env node

import { Command } from "commander";
import { scanStaged } from "./commands/scan-staged.js";
import { scanDir } from "./commands/scan-dir.js";
import { getFilesFromGit } from "./git.js";

const program = new Command();

program
  .name("secretsweep")
  .description("Zero-config secret scanning for staged git files")
  .version("1.0.0");

program
  .command("scan", { isDefault: true })
  .description("Scan a directory for secrets")
  .argument("[path]", "directory to scan", ".")
  .action(async (path: string) => {
    const results = await scanDir(path);
    outputResults(results);
    process.exitCode = results.length > 0 ? 1 : 0;
  });

program
  .command("staged")
  .description("Scan staged git files for secrets (pre-commit friendly)")
  .action(async () => {
    const files = await getFilesFromGit();
    if (files.length === 0) {
      console.log("✓ No staged files to scan");
      return;
    }
    const results = await scanStaged(files);
    outputResults(results);
    process.exitCode = results.length > 0 ? 1 : 0;
  });

function outputResults(findings: Array<{ file: string; line: number; type: string; match: string }>) {
  if (findings.length === 0) {
    console.log("✓ No secrets found");
    return;
  }
  console.log(`\n⚠ Found ${findings.length} potential secret${findings.length > 1 ? "s" : ""}:\n`);
  for (const f of findings) {
    const preview = f.match.length > 60 ? f.match.slice(0, 57) + "..." : f.match;
    console.log(`  ${f.file}:${f.line}  [${f.type}]  ${preview}`);
  }
  console.log(`\n${findings.length} finding(s). Remove secrets before committing.`);
}

program.parse();
