import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const MAX_WORDS = 15;

type Finding = {
  file: string;
  path: string;
  quote: string;
  wordCount: number;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function walk(
  obj: unknown,
  path: string,
  findings: Finding[],
  file: string,
): void {
  if (obj === null || obj === undefined) return;
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
  const data = JSON.parse(raw);
  const findings: Finding[] = [];
  walk(data, "", findings, relativePath);
  return findings;
}

const TARGETS = [
  "lib/licenses.json",
  "lib/training-data-risks.json",
  "lib/compatibility-matrix.json",
];

const allFindings: Finding[] = [];
for (const file of TARGETS) {
  try {
    allFindings.push(...checkFile(file));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("ENOENT")) {
      console.error(`Error reading ${file}: ${msg}`);
      process.exit(2);
    }
  }
}

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
