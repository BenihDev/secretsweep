import { scanContent, loadIgnorePatterns, shouldIgnore, type Finding } from "../scanner.js";
import { readFileFromGit } from "../git.js";

export async function scanStaged(files: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const ignorePatterns = loadIgnorePatterns(".");

  for (const file of files) {
    if (shouldIgnore(file, ignorePatterns)) continue;

    // Skip binary files
    if (/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip|tar|gz|pdf|exe|dll|so|dylib|bin)$/i.test(file)) {
      continue;
    }

    const content = readFileFromGit(file);
    if (content === null) continue;

    const fileFindings = scanContent(content, file);
    findings.push(...fileFindings);
  }

  return findings;
}
