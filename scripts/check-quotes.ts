import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MAX_WORDS = 15;

type Finding = {
  file: string;
  path: string;
  quote: string;
  wordCount: number;
};

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function walk(
  obj: unknown,
  path: string,
  findings: Finding[],
  file: string,
): void {
  if (obj === null) return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${path}[${i}]`, findings, file));
    return;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (key === "quote" && typeof value === "string") {
        const wc = countWords(value);
        if (wc > MAX_WORDS) {
          findings.push({ file, path: nextPath, quote: value, wordCount: wc });
        }
      } else {
        walk(value, nextPath, findings, file);
      }
    }
  }
}

function checkFile(relativePath: string): Finding[] {
  const full = join(ROOT, relativePath);
  const raw = readFileSync(full, "utf8");
  const data: unknown = JSON.parse(raw);
  const findings: Finding[] = [];
  walk(data, "", findings, relativePath);
  return findings;
}

const TARGETS = [
  "lib/licenses.json",
  "lib/training-data-risks.json",
  "lib/compatibility-matrix.json",
];

const allFindings = TARGETS.flatMap(checkFile);

if (allFindings.length > 0) {
  console.error(
    `FAIL: ${allFindings.length} quote(s) exceed ${MAX_WORDS} words.`,
  );
  for (const f of allFindings) {
    console.error(
      `  [${f.file}] ${f.path} (${f.wordCount} words): ${f.quote.slice(0, 80)}...`,
    );
  }
  process.exit(1);
}

console.log(`OK: all quotes <= ${MAX_WORDS} words.`);
