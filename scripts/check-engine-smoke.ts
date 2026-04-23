import { runCheck } from "../lib/check-engine";
import { loadRegistry, RegistryError } from "../lib/registry";
import compatibilityMatrixData from "../lib/compatibility-matrix.json";
import licensesData from "../lib/licenses.json";
import modelsData from "../lib/models.json";
import trainingRisksData from "../lib/training-data-risks.json";
import useCasesData from "../lib/use-cases.json";
import type {
  CheckInput,
  CheckResult,
  CompatibilityMatrix,
  License,
  Model,
  TrainingDataRisk,
  UseCase,
} from "../lib/types";
import type { RegistryInput } from "../lib/registry";

type Assertion = { ok: boolean; msg: string };
type ScenarioResult = {
  name: string;
  assertions: Assertion[];
  info: string;
};

function assert(ok: boolean, msg: string): Assertion {
  return { ok, msg };
}

function summarize(r: CheckResult): string {
  return `overallRisk=${r.overallRisk} complete=${r.complete} rows=${r.rows.length} cols=${r.cols.length} conflicts=${r.modelCodeConflicts.length} ucv=${r.useCaseViolations.length} missing=${r.missingPairs.length} recs=${r.recommendations.length}`;
}

function runEngine(
  name: string,
  input: CheckInput,
  check: (r: CheckResult) => Assertion[],
): ScenarioResult {
  const result = runCheck(input);
  return { name, info: summarize(result), assertions: check(result) };
}

function expectThrow(
  name: string,
  fn: () => unknown,
  matcher: (err: unknown) => Assertion[],
): ScenarioResult {
  try {
    fn();
    return {
      name,
      info: "(kein Throw)",
      assertions: [assert(false, "Fehler erwartet, aber kein Throw")],
    };
  } catch (err) {
    const info = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { name, info, assertions: matcher(err) };
  }
}

function baseInput(): RegistryInput {
  return {
    licenses: licensesData as License[],
    models: modelsData as Model[],
    useCases: useCasesData as UseCase[],
    trainingRisks: trainingRisksData as TrainingDataRisk[],
    compatibilityMatrix: compatibilityMatrixData as CompatibilityMatrix,
  };
}

function cloneInput(): RegistryInput {
  return JSON.parse(JSON.stringify(baseInput())) as RegistryInput;
}

// ------------------------------------------------------------
// Engine-Szenarien
// ------------------------------------------------------------

// A: permissives Setup mit high-risk Trainingsdaten -> yellow erwartet.
const scenarioA = runEngine(
  "A: gemma-4 (apache) + MIT/Apache/BSD Code, internal-commercial, web-crawl",
  {
    models: ["gemma-4-31b"],
    codeDependencies: ["mit", "apache-2-0", "bsd-3-clause"],
    trainingData: ["web-crawl"],
    useCase: "internal-commercial",
  },
  (r) => [
    assert(r.complete === true, "complete muss true sein (alle Paare kuratiert)"),
    assert(
      r.overallRisk === "yellow",
      `overallRisk=yellow erwartet (web-crawl high), bekommen: ${r.overallRisk}`,
    ),
    assert(r.rows.length === 1, "eine Zeile (ein Modell) erwartet"),
    assert(r.cols.length === 3, "drei Spalten (drei Code-Lizenzen) erwartet"),
    assert(r.trainingDataFlags.length === 1, "ein Training-Flag erwartet"),
  ],
);

// B: Llama conditional bei SaaS -> yellow.
const scenarioB = runEngine(
  "B: llama-4-maverick + apache Code, saas-external",
  {
    models: ["llama-4-maverick"],
    codeDependencies: ["apache-2-0"],
    trainingData: [],
    useCase: "saas-external",
  },
  (r) => [
    assert(r.complete === true, "complete muss true sein"),
    assert(
      r.overallRisk === "yellow",
      `overallRisk=yellow erwartet (conditional Llama), bekommen: ${r.overallRisk}`,
    ),
    assert(
      r.modelCodeConflicts.some((c) => c.severity === "medium"),
      "mindestens ein conditional-Konflikt erwartet",
    ),
    assert(
      r.recommendations.length > 0,
      "recommendations sollten aus Llama-caveats aggregiert sein",
    ),
  ],
);

// C: Self-Pair. Modell apache + Code apache -> Zelle "self", kein Konflikt.
const scenarioC = runEngine(
  "C: qwen3-235b (apache) + apache Code, research-only (Self-Pair)",
  {
    models: ["qwen3-235b"],
    codeDependencies: ["apache-2-0"],
    trainingData: [],
    useCase: "research-only",
  },
  (r) => [
    assert(r.complete === true, "complete muss true sein"),
    assert(r.matrix[0][0].status === "self", "Self-Pair-Zelle muss status=self haben"),
    assert(
      r.modelCodeConflicts.length === 0,
      "Self-Pair darf keinen Konflikt erzeugen",
    ),
    assert(
      r.overallRisk === "green",
      `overallRisk=green erwartet (apache ist für research-only unkritisch), bekommen: ${r.overallRisk}`,
    ),
  ],
);

// D: Missing-Paar. bsl-1-0 x mit ist in der aktuellen Matrix nicht kuratiert.
const scenarioD = runEngine(
  "D: deepseek-v3-2 (mit) + bsl-1-0 Code, internal-commercial (erwartet missing)",
  {
    models: ["deepseek-v3-2"],
    codeDependencies: ["bsl-1-0"],
    trainingData: [],
    useCase: "internal-commercial",
  },
  (r) => [
    assert(
      r.overallRisk === "missing",
      `overallRisk=missing erwartet, bekommen: ${r.overallRisk}`,
    ),
    assert(r.complete === false, "complete muss false sein"),
    assert(r.missingPairs.length >= 1, "mindestens ein missing pair erwartet"),
    assert(
      r.matrix[0][0].status === "missing",
      "Zelle muss status=missing haben",
    ),
    assert(
      r.recommendations.some((t) => t.toLowerCase().includes("nicht kuratiert")),
      "Recommendation muss auf fehlende Kuratierung hinweisen",
    ),
  ],
);

// E: Recommendations dedupliziert + priorisiert.
const scenarioE = runEngine(
  "E: doppelte Dependencies -> Spalten-Dedup + Recommendations-Dedup",
  {
    models: ["llama-4-maverick"],
    codeDependencies: ["apache-2-0", "apache-2-0", "mit"],
    trainingData: [],
    useCase: "saas-external",
  },
  (r) => {
    const unique = new Set(r.recommendations);
    return [
      assert(r.cols.length === 2, "Dedup bei codeDependencies: 2 Spalten erwartet"),
      assert(
        r.cols.find((c) => c.license_id === "apache-2-0")?.dep_count === 2,
        "apache-2-0 muss dep_count=2 haben",
      ),
      assert(
        unique.size === r.recommendations.length,
        "Recommendations müssen dedupliziert sein",
      ),
    ];
  },
);

// F: UCV ohne Matrixzellen. models=[] + NC-Code + internal-commercial ->
// keine Matrix-Paare, aber Code-Lizenz erzwingt UCV high -> red.
const scenarioF = runEngine(
  "F: models=[] + flux-1-dev-nc Code, internal-commercial (UCV ohne Matrix)",
  {
    models: [],
    codeDependencies: ["flux-1-dev-nc"],
    trainingData: [],
    useCase: "internal-commercial",
  },
  (r) => [
    assert(r.rows.length === 0, "keine Zeilen erwartet"),
    assert(r.matrix.length === 0, "Matrix ist leer (keine Zeilen)"),
    assert(r.complete === true, "complete=true, da keine fehlenden Paare existieren"),
    assert(
      r.useCaseViolations.some(
        (v) => v.license_id === "flux-1-dev-nc" && v.severity === "high",
      ),
      "UCV high für flux-1-dev-nc erwartet (commercial_use=no bei internal-commercial)",
    ),
    assert(
      r.overallRisk === "red",
      `overallRisk=red erwartet (UCV high), bekommen: ${r.overallRisk}`,
    ),
  ],
);

// G: Präzedenz-Test. Missing Pair UND high-risk Training-Data ->
// overallRisk bleibt "missing", wird nicht von yellow überdeckt.
const scenarioG = runEngine(
  "G: missing pair + web-crawl -> missing hat Präzedenz vor yellow",
  {
    models: ["deepseek-v3-2"],
    codeDependencies: ["bsl-1-0"],
    trainingData: ["web-crawl"],
    useCase: "internal-commercial",
  },
  (r) => [
    assert(
      r.overallRisk === "missing",
      `missing hat Präzedenz; bekommen: ${r.overallRisk}`,
    ),
    assert(r.missingPairs.length >= 1, "missing pair muss registriert sein"),
    assert(
      r.trainingDataFlags.length === 1,
      "Training-Flag wird trotzdem gesammelt (nur Ampel unterdrückt)",
    ),
  ],
);

// H1: unbekannte Model-ID -> Throw.
const scenarioH1 = expectThrow(
  "H1: unbekannte Model-ID wirft Error",
  () =>
    runCheck({
      models: ["kein-modell-xyz"],
      codeDependencies: ["mit"],
      trainingData: [],
      useCase: "internal-commercial",
    }),
  (err) => [
    assert(err instanceof Error, "Error-Instanz erwartet"),
    assert(
      err instanceof Error && err.message.includes("kein-modell-xyz"),
      "Fehler-Message muss ID enthalten",
    ),
  ],
);

// H2: unbekannte Code-Lizenz-ID -> Throw.
const scenarioH2 = expectThrow(
  "H2: unbekannte Code-Lizenz-ID wirft Error",
  () =>
    runCheck({
      models: ["qwen3-235b"],
      codeDependencies: ["keine-lizenz-xyz"],
      trainingData: [],
      useCase: "internal-commercial",
    }),
  (err) => [
    assert(err instanceof Error, "Error-Instanz erwartet"),
    assert(
      err instanceof Error && err.message.includes("keine-lizenz-xyz"),
      "Fehler-Message muss ID enthalten",
    ),
  ],
);

// H3: unbekannte Training-Risk-ID -> Throw.
const scenarioH3 = expectThrow(
  "H3: unbekannte Training-Risk-ID wirft Error",
  () =>
    runCheck({
      models: ["qwen3-235b"],
      codeDependencies: ["mit"],
      trainingData: ["kein-risiko-xyz"],
      useCase: "internal-commercial",
    }),
  (err) => [
    assert(err instanceof Error, "Error-Instanz erwartet"),
    assert(
      err instanceof Error && err.message.includes("kein-risiko-xyz"),
      "Fehler-Message muss ID enthalten",
    ),
  ],
);

// ------------------------------------------------------------
// Registry-Negativtests
// ------------------------------------------------------------

// R1: doppeltes Paar (ungeordnet) -> RegistryError.
const scenarioR1 = expectThrow(
  "R1: doppeltes Paar (ungeordnet) wird erkannt",
  () => {
    const input = cloneInput();
    const original = input.compatibilityMatrix.pairs[0];
    input.compatibilityMatrix.pairs.push({
      ...original,
      license_a: original.license_b,
      license_b: original.license_a,
    });
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError && err.message.toLowerCase().includes("doppelt"),
      "Message muss auf Duplikat hinweisen",
    ),
  ],
);

// R2: fehlender scenarios-Key -> RegistryError.
const scenarioR2 = expectThrow(
  "R2: fehlender scenarios-Key wird erkannt",
  () => {
    const input = cloneInput();
    const pair = input.compatibilityMatrix.pairs[0];
    delete (pair.scenarios as Partial<typeof pair.scenarios>)["saas-external"];
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError && err.message.includes("saas-external"),
      "Message muss fehlenden Use-Case benennen",
    ),
  ],
);

// R3: ungültiger scenarios-Wert -> RegistryError.
const scenarioR3 = expectThrow(
  "R3: ungültiger scenarios-Wert wird erkannt",
  () => {
    const input = cloneInput();
    const pair = input.compatibilityMatrix.pairs[0];
    (pair.scenarios as Record<string, string>)["redistribution"] = "maybe";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError && err.message.includes("redistribution"),
      "Message muss Use-Case benennen",
    ),
  ],
);

// R4: unbekannte Lizenz-Referenz in Matrix -> RegistryError.
const scenarioR4 = expectThrow(
  "R4: unbekannte Lizenz-ID in Matrix-Paar wird erkannt",
  () => {
    const input = cloneInput();
    input.compatibilityMatrix.pairs[0].license_a = "lizenz-existiert-nicht";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError &&
        err.message.includes("lizenz-existiert-nicht"),
      "Message muss unbekannte ID benennen",
    ),
  ],
);

// R5: Self-Pair in Matrix -> RegistryError (Self-Pairs sind synthetisch).
const scenarioR5 = expectThrow(
  "R5: Self-Pair in Matrix wird erkannt",
  () => {
    const input = cloneInput();
    input.compatibilityMatrix.pairs[0].license_b =
      input.compatibilityMatrix.pairs[0].license_a;
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError &&
        err.message.toLowerCase().includes("identisch"),
      "Message muss auf identische Lizenzen hinweisen",
    ),
  ],
);

// R6: Model mit unbekannter license_id -> RegistryError.
const scenarioR6 = expectThrow(
  "R6: Model mit unbekannter license_id wird erkannt",
  () => {
    const input = cloneInput();
    input.models[0].license_id = "lizenz-existiert-nicht";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError &&
        err.message.includes("lizenz-existiert-nicht"),
      "Message muss unbekannte Lizenz benennen",
    ),
  ],
);

// R7: fehlender Use-Case -> RegistryError.
const scenarioR7 = expectThrow(
  "R7: fehlender Use-Case in Registry wird erkannt",
  () => {
    const input = cloneInput();
    input.useCases = input.useCases.filter((u) => u.id !== "redistribution");
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError && err.message.includes("redistribution"),
      "Message muss fehlenden Use-Case benennen",
    ),
  ],
);

// R8: ungültiger License.rights-Enum-Wert -> RegistryError.
const scenarioR8 = expectThrow(
  "R8: ungültiger License.rights.commercial_use wird erkannt",
  () => {
    const input = cloneInput();
    (input.licenses[0].rights as unknown as Record<string, unknown>)
      .commercial_use = "maybe";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError && err.message.includes("commercial_use"),
      "Message muss Feld benennen",
    ),
  ],
);

// R9: License.rights.attribution_required ohne boolean -> RegistryError.
const scenarioR9 = expectThrow(
  "R9: License.rights.attribution_required ohne boolean wird erkannt",
  () => {
    const input = cloneInput();
    (input.licenses[0].rights as unknown as Record<string, unknown>)
      .attribution_required = "ja";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError &&
        err.message.includes("attribution_required"),
      "Message muss Feld benennen",
    ),
  ],
);

// R10: UseCase.license_sensitivity ohne boolean -> RegistryError.
const scenarioR10 = expectThrow(
  "R10: ungültiger UseCase.license_sensitivity-Wert wird erkannt",
  () => {
    const input = cloneInput();
    (
      input.useCases[0].license_sensitivity as Record<string, unknown>
    ).commercial_use_required = "ja";
    return loadRegistry(input);
  },
  (err) => [
    assert(err instanceof RegistryError, "RegistryError erwartet"),
    assert(
      err instanceof RegistryError &&
        err.message.includes("commercial_use_required"),
      "Message muss Schalter benennen",
    ),
  ],
);

// R11: Registry-Entry ist frozen (Mutation wirft in strict mode).
const scenarioR11: ScenarioResult = (() => {
  const registry = loadRegistry(cloneInput());
  const license = registry.getLicense("mit");
  const assertions: Assertion[] = [];
  assertions.push(assert(license !== null, "mit-Lizenz muss existieren"));
  assertions.push(
    assert(Object.isFrozen(license), "Lizenz-Eintrag muss eingefroren sein"),
  );
  if (license) {
    assertions.push(
      assert(
        Object.isFrozen(license.rights),
        "License.rights muss eingefroren sein (deep)",
      ),
    );
  }
  return {
    name: "R11: Registry-Entries sind deep-frozen",
    info: `frozen=${license ? Object.isFrozen(license) : "n/a"}`,
    assertions,
  };
})();

// ------------------------------------------------------------
// Lauf
// ------------------------------------------------------------

const all: ScenarioResult[] = [
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
  scenarioE,
  scenarioF,
  scenarioG,
  scenarioH1,
  scenarioH2,
  scenarioH3,
  scenarioR1,
  scenarioR2,
  scenarioR3,
  scenarioR4,
  scenarioR5,
  scenarioR6,
  scenarioR7,
  scenarioR8,
  scenarioR9,
  scenarioR10,
  scenarioR11,
];

let failed = 0;
for (const sc of all) {
  console.log(`\n### ${sc.name}`);
  console.log(`  ${sc.info}`);
  for (const a of sc.assertions) {
    console.log(`  ${a.ok ? "OK  " : "FAIL"}  ${a.msg}`);
    if (!a.ok) failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} Assertion(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`\nAlle ${all.length} Szenarien durchgelaufen, keine Assertion verletzt.`);
