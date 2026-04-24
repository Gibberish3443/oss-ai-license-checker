import { evaluateCompatibility } from "./evaluate";
import { defaultRegistry, type Registry } from "./registry";
import { isCuratedStatus } from "./types";
import type {
  CheckInput,
  CheckResult,
  CuratedStatus,
  CompatibilityCell,
  Conflict,
  License,
  MatrixColumn,
  MatrixRow,
  MissingPair,
  Model,
  OverallRisk,
  Source,
  TrainingDataFlag,
  TrainingDataRisk,
  UseCase,
  UseCaseViolation,
} from "./types";

/**
 * Wird geworfen, wenn `runCheck` Eingaben mit IDs erhält, die in der Registry
 * nicht aufgelöst werden können. Trennt erwartbare Domain-Fehler (UI darf sie
 * freundlich anzeigen) von echten Bugs (sollen als unbehandelte Exception
 * sichtbar werden, statt im Catch zu verpuffen).
 */
export class EngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineInputError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function severityForStatus(status: CuratedStatus): Conflict["severity"] | null {
  if (status === "incompatible") return "high";
  if (status === "conditional") return "medium";
  return null;
}

interface RecEntry {
  text: string;
  prio: number;
}

interface CanonicalLicensePair {
  license_a: string;
  license_b: string;
}

function priorityForCellStatus(status: CuratedStatus): number {
  if (status === "incompatible") return 1;
  if (status === "conditional") return 3;
  return 8;
}

function priorityForSeverity(severity: "high" | "medium" | "low"): number {
  if (severity === "high") return 2;
  if (severity === "medium") return 4;
  return 8;
}

function priorityForRiskLevel(level: "high" | "medium" | "low"): number {
  if (level === "high") return 5;
  if (level === "medium") return 6;
  return 7;
}

type LicenseSensitivityKey = keyof UseCase["license_sensitivity"];

const LICENSE_SENSITIVITY_EXPLANATIONS: Record<
  LicenseSensitivityKey,
  string
> = {
  commercial_use_required:
    "der Einsatz ausdrücklich kommerzielle Nutzung voraussetzt",
  distribution_required: "Ergebnisse oder Software an Dritte weitergegeben werden",
  network_use: "das System extern über ein Netzwerk bereitgestellt wird",
  derivative_works: "das Modell in bearbeitete oder abgeleitete Lösungen einfließt",
};

const TRAINING_RISK_TRIGGER_ORDER: Record<
  string,
  readonly LicenseSensitivityKey[]
> = {
  "web-crawl": [
    "commercial_use_required",
    "network_use",
    "distribution_required",
    "derivative_works",
  ],
  "github-code": [
    "derivative_works",
    "distribution_required",
    "commercial_use_required",
    "network_use",
  ],
  "stock-images": [
    "distribution_required",
    "network_use",
    "commercial_use_required",
    "derivative_works",
  ],
  "user-generated-content": [
    "derivative_works",
    "distribution_required",
    "commercial_use_required",
    "network_use",
  ],
  "publisher-texts": [
    "commercial_use_required",
    "distribution_required",
    "network_use",
    "derivative_works",
  ],
  "public-official": [
    "derivative_works",
    "commercial_use_required",
    "distribution_required",
    "network_use",
  ],
};

function joinGermanList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function canonicalizeLicensePair(
  licenseA: string,
  licenseB: string,
): CanonicalLicensePair {
  return licenseA < licenseB
    ? { license_a: licenseA, license_b: licenseB }
    : { license_a: licenseB, license_b: licenseA };
}

function relevantTrainingSwitches(
  riskId: string,
  useCase: UseCase,
): LicenseSensitivityKey[] {
  const activeSwitches = (
    Object.keys(LICENSE_SENSITIVITY_EXPLANATIONS) as LicenseSensitivityKey[]
  ).filter((key) => useCase.license_sensitivity[key]);
  const preferredSwitches = (TRAINING_RISK_TRIGGER_ORDER[riskId] ?? []).filter(
    (key) => useCase.license_sensitivity[key],
  );
  return preferredSwitches.length > 0 ? preferredSwitches : activeSwitches;
}

function buildTrainingFlagReason(
  risk: TrainingDataRisk,
  useCase: UseCase,
): string {
  const triggeredSwitches = relevantTrainingSwitches(risk.id, useCase);
  const legalIssues = risk.legal_issues.map((issue) => `"${issue.issue}"`);
  const legalIssuesText = joinGermanList(legalIssues);
  const issuesSentence = legalIssuesText
    ? ` Konkrete Streitpunkte sind ${legalIssuesText}.`
    : "";

  if (triggeredSwitches.length === 0) {
    return `Für den Use-Case "${useCase.name}" ist aktuell kein expliziter license_sensitivity-Schalter aktiv. Trainingsdaten-Risiko "${risk.id}" (${risk.name}) bleibt dennoch als eigenständiger Prüfhinweis sichtbar.${issuesSentence}`;
  }

  const switchText = joinGermanList(
    triggeredSwitches.map(
      (key) => `"${key}" (${LICENSE_SENSITIVITY_EXPLANATIONS[key]})`,
    ),
  );
  const switchLabel =
    triggeredSwitches.length === 1
      ? "dem aktiven Use-Case-Schalter"
      : "den aktiven Use-Case-Schaltern";

  return `Trainingsdaten-Risiko "${risk.id}" (${risk.name}) kollidiert im Use-Case "${useCase.name}" mit ${switchLabel} ${switchText}. Deshalb ist dieses Risikoprofil hier relevant.${issuesSentence}`;
}

/**
 * Prüft, ob eine Lizenz gegen die Anforderungen eines Use-Case verstößt,
 * unabhängig von Inter-Lizenz-Konflikten. Deckt unter anderem den Self-Pair-Fall
 * ab: gleiche Lizenz auf Modell- und Code-Seite taugt formal zueinander,
 * scheitert aber ggf. am Use-Case (z. B. research-only unter internal-commercial).
 */
function evaluateUseCaseFit(
  license: License,
  useCase: UseCase,
): UseCaseViolation[] {
  const violations: UseCaseViolation[] = [];
  const sens = useCase.license_sensitivity;
  const rights = license.rights;

  if (sens.commercial_use_required) {
    if (rights.commercial_use === "no") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz untersagt kommerzielle Nutzung, Use-Case "${useCase.name}" setzt sie voraus.`,
        severity: "high",
      });
    } else if (rights.commercial_use === "conditional") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz erlaubt kommerzielle Nutzung nur bedingt, Use-Case "${useCase.name}" setzt sie voraus — Bedingungen prüfen.`,
        severity: "medium",
      });
    }
  }

  if (sens.distribution_required) {
    if (rights.distribution === "no") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz untersagt Weitergabe, Use-Case "${useCase.name}" setzt sie voraus.`,
        severity: "high",
      });
    } else if (rights.distribution === "conditional") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz erlaubt Weitergabe nur bedingt, Use-Case "${useCase.name}" setzt sie voraus — Bedingungen prüfen.`,
        severity: "medium",
      });
    }
  }

  if (sens.derivative_works) {
    if (rights.modification === "no") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz untersagt Bearbeitungen, Use-Case "${useCase.name}" setzt sie voraus.`,
        severity: "high",
      });
    } else if (rights.modification === "conditional") {
      violations.push({
        license_id: license.id,
        violation: `Lizenz erlaubt Bearbeitungen nur bedingt, Use-Case "${useCase.name}" setzt sie voraus — Bedingungen prüfen.`,
        severity: "medium",
      });
    }
  }

  if (sens.network_use && rights.copyleft === "network") {
    violations.push({
      license_id: license.id,
      violation: `Network-Copyleft (AGPL-artig) kann im Use-Case "${useCase.name}" greifen, insbesondere bei modifizierter Software mit Remote-Netzinteraktion. Geschlossene SaaS-Nutzung ist ohne Source-Angebot nicht tragfaehig.`,
      severity: "high",
    });
  }

  return violations;
}

/**
 * Führt die Prüfung für einen konkreten Eingabe-Satz durch.
 *
 * Achsen des Ergebnis-Grids:
 *  - Zeilen = die übergebenen Modelle (eine Zeile je Modell-ID, Lizenz aus models.json)
 *  - Spalten = deduplizierte Code-Lizenz-IDs aus `codeDependencies`. Das
 *    Feld `dep_count` zählt, wie oft dieselbe Lizenz-ID im Input auftauchte;
 *    die Zuordnung Dep → Lizenz-ID liegt beim Aufrufer (UI).
 *
 * Reihenfolge-Vertrag:
 *  - `rows` folgt `input.models` (Eingabe-Order, inkl. Duplikate unzulässig nicht validiert).
 *  - `cols` folgt der First-Seen-Order deduplizierter Lizenz-IDs in
 *    `input.codeDependencies`.
 *  - `sources` folgt Einfüge-Order der beteiligten Lizenzen (Modelle zuerst,
 *    danach Code-Lizenzen).
 *  - `recommendations` ist stabil nach Priorität sortiert, bei Gleichstand
 *    nach First-Seen-Index. Für logisch identische Eingaben in anderer
 *    Reihenfolge ist die Ausgabe nicht kanonisch gleich.
 *  - `missingPairs` enthält einen Eintrag pro betroffener Zellbelegung und
 *    kann dasselbe `(license_a, license_b)`-Paar mehrfach führen, wenn es in
 *    unterschiedlichen Zellen auftaucht (unterschiedlicher `context`). Die
 *    Lizenz-IDs werden kanonisiert abgelegt (lexikographisch, analog
 *    `registry.findPair`), damit spiegelbildliche Kombinationen beim
 *    Empfehlungs-Dedup als derselbe Hinweis greifen.
 *
 * Self-Pair (Zeile und Spalte haben dieselbe Lizenz) wird nicht aus der
 * kuratierten Matrix gelesen, sondern synthetisch als "self" markiert: kein
 * Inter-License-Konflikt, Use-Case-Tauglichkeit wird separat über
 * `useCaseViolations` abgebildet.
 *
 * Fehlen Einträge in der kuratierten Matrix, wird das Ergebnis explizit als
 * `complete: false` markiert und `overallRisk` auf `"missing"` gesetzt. Die
 * Ampel (`green`/`yellow`/`red`) wird in diesem Fall gar nicht erst gerechnet,
 * weil der Zustand "ungeprüft" nicht wie "geprüft, aber mit Auflagen"
 * aussehen soll.
 *
 * Registry ist per Default die aus den Katalog-JSONs geladene
 * {@link defaultRegistry}; Tests können eine alternative Registry injizieren,
 * z. B. um korrupte Kataloge zu prüfen.
 */
export function runCheck(
  input: CheckInput,
  registry: Registry = defaultRegistry,
): CheckResult {
  const useCase = registry.getUseCase(input.useCase);
  if (!useCase) {
    throw new EngineInputError(`Unbekannter Use-Case: ${input.useCase}`);
  }

  // Zeilen: Modelle auflösen und Modell-Lizenz aus der Registry ziehen.
  const rows: MatrixRow[] = [];
  const selectedModels: Model[] = [];
  for (const modelId of input.models) {
    const model = registry.getModel(modelId);
    if (!model) {
      throw new EngineInputError(`Unbekannte Model-ID: ${modelId}`);
    }
    // Referenz-Integrität der Model→License-Kante wird bereits in loadRegistry
    // geprüft; hier kann nichts mehr durchrutschen.
    selectedModels.push(model);
    rows.push({ model_id: model.id, license_id: model.license_id });
  }

  // Spalten: Code-Lizenzen deduplizieren und zählen (First-Seen-Order).
  const depCounts = new Map<string, number>();
  for (const licenseId of input.codeDependencies) {
    if (!registry.getLicense(licenseId)) {
      throw new EngineInputError(`Unbekannte Code-Lizenz-ID: ${licenseId}`);
    }
    depCounts.set(licenseId, (depCounts.get(licenseId) ?? 0) + 1);
  }
  const cols: MatrixColumn[] = Array.from(depCounts.entries()).map(
    ([license_id, dep_count]) => ({ license_id, dep_count }),
  );
  const selectedDependencyLicenses = cols
    .map((col) => registry.getLicense(col.license_id))
    .filter((license): license is License => Boolean(license));

  // Matrix befüllen, Konflikte sammeln, fehlende Paare separat tracken.
  const matrix: CompatibilityCell[][] = [];
  const modelCodeConflicts: Conflict[] = [];
  const missingPairs: MissingPair[] = [];

  for (const row of rows) {
    const rowCells: CompatibilityCell[] = [];
    for (const col of cols) {
      if (row.license_id === col.license_id) {
        rowCells.push({
          row: row.model_id,
          col: col.license_id,
          status: "self",
          reasoning:
            "Identische Lizenz auf Modell- und Code-Seite. Kein Inter-License-Konflikt; Use-Case-Tauglichkeit wird separat geprüft.",
          caveats: [],
        });
        continue;
      }

      const pair = registry.findPair(row.license_id, col.license_id);
      if (!pair) {
        const missingPair = canonicalizeLicensePair(row.license_id, col.license_id);
        missingPairs.push({
          ...missingPair,
          context: `model:${row.model_id} x code-license:${col.license_id}`,
        });
        rowCells.push({
          row: row.model_id,
          col: col.license_id,
          status: "missing",
          reasoning:
            "Kein kuratiertes Matrix-Paar vorhanden. Ergebnis ist ungeprüft.",
          caveats: [],
        });
        continue;
      }

      // scenarios-Coverage wurde in loadRegistry hart geprüft, status ist
      // hier garantiert ein gültiger Compatibility-Wert.
      const status = pair.scenarios[input.useCase];
      rowCells.push({
        row: row.model_id,
        col: col.license_id,
        status,
        reasoning: pair.reasoning,
        caveats: pair.caveats,
        reviewed_by_user: pair.reviewed_by_user ?? false,
      });

      const severity = severityForStatus(status);
      if (severity) {
        modelCodeConflicts.push({
          license_a: row.license_id,
          license_b: col.license_id,
          reasoning: pair.reasoning,
          severity,
        });
      }
    }
    matrix.push(rowCells);
  }

  // Use-Case-Tauglichkeit aller beteiligten Lizenzen (Modelle + Code).
  // Einfüge-Order: Modelle zuerst, danach Code-Lizenzen.
  const involvedLicenseIds = new Set<string>();
  for (const row of rows) involvedLicenseIds.add(row.license_id);
  for (const col of cols) involvedLicenseIds.add(col.license_id);

  const useCaseViolations: UseCaseViolation[] = [];
  for (const licenseId of involvedLicenseIds) {
    const license = registry.getLicense(licenseId);
    if (!license) continue;
    useCaseViolations.push(...evaluateUseCaseFit(license, useCase));
  }

  // Trainingsdaten-Risiken auflösen.
  const trainingDataFlags: TrainingDataFlag[] = [];
  const selectedTrainingRisks: TrainingDataRisk[] = [];
  for (const riskId of input.trainingData) {
    const risk = registry.getTrainingRisk(riskId);
    if (!risk) {
      throw new EngineInputError(`Unbekannte Training-Risk-ID: ${riskId}`);
    }
    selectedTrainingRisks.push(risk);
    trainingDataFlags.push({
      risk_id: risk.id,
      risk_level: risk.risk_level,
      reason: buildTrainingFlagReason(risk, useCase),
    });
  }

  const findings = evaluateCompatibility(
    selectedModels,
    selectedDependencyLicenses,
    selectedTrainingRisks,
    useCase,
    registry,
  );

  // Overall Risk.
  //   - missing: fehlt mindestens ein Matrix-Paar, keine Ampel
  //   - red:     mindestens ein Paar im Use-Case incompatible ODER Use-Case-Violation high
  //   - yellow:  mindestens ein Paar conditional ODER Use-Case-Violation medium
  //              ODER Trainingsdaten-Risiko medium/high
  //   - green:   sonst
  let overallRisk: OverallRisk;
  const complete = missingPairs.length === 0;
  if (!complete) {
    overallRisk = "missing";
  } else {
    const hasIncompatible = modelCodeConflicts.some(
      (c) => c.severity === "high",
    );
    const hasConditional = modelCodeConflicts.some(
      (c) => c.severity === "medium",
    );
    const hasHighUcv = useCaseViolations.some((v) => v.severity === "high");
    const hasMediumUcv = useCaseViolations.some((v) => v.severity === "medium");
    const hasFindingConflict = findings.some(
      (finding) => finding.severity === "conflict",
    );
    const hasFindingNotice = findings.some(
      (finding) => finding.severity === "notice",
    );
    const hasMedHighTraining = trainingDataFlags.some(
      (t) => t.risk_level === "high" || t.risk_level === "medium",
    );
    if (hasIncompatible || hasHighUcv || hasFindingConflict) {
      overallRisk = "red";
    } else if (
      hasConditional ||
      hasMediumUcv ||
      hasFindingNotice ||
      hasMedHighTraining
    ) {
      overallRisk = "yellow";
    } else {
      overallRisk = "green";
    }
  }

  // Recommendations: aggregieren, deduplizieren, priorisieren.
  const recEntries: RecEntry[] = [];

  for (const mp of missingPairs) {
    recEntries.push({
      text: `Matrix-Paar ${mp.license_a} <-> ${mp.license_b} ist nicht kuratiert und muss vor Produktiveinsatz manuell bewertet werden.`,
      prio: 0,
    });
  }

  for (const ucv of useCaseViolations) {
    recEntries.push({
      text: ucv.violation,
      prio: priorityForSeverity(ucv.severity),
    });
  }

  for (const finding of findings) {
    if (finding.kind === "compliance") continue;
    const prio =
      finding.kind === "training-data"
        ? priorityForRiskLevel(
            registry.getTrainingRisk(finding.risk_id)?.risk_level ?? "low",
          )
        : finding.severity === "conflict"
          ? 1
          : 3;
    recEntries.push({
      text: finding.recommendation,
      prio,
    });
  }

  for (const rowCells of matrix) {
    for (const cell of rowCells) {
      if (!isCuratedStatus(cell.status)) {
        continue;
      }
      const prio = priorityForCellStatus(cell.status);
      for (const caveat of cell.caveats) {
        recEntries.push({ text: caveat, prio });
      }
    }
  }

  for (const flag of trainingDataFlags) {
    const risk = registry.getTrainingRisk(flag.risk_id);
    if (!risk) continue;
    const prio = priorityForRiskLevel(flag.risk_level);
    for (const hint of risk.mitigation_hints) {
      recEntries.push({ text: hint, prio });
    }
  }

  // Dedup: gleicher Text -> niedrigste Priorität gewinnt. Stable sort nach prio,
  // Tiebreak über First-Seen-Index.
  const bestPrioByText = new Map<string, number>();
  const firstSeenIndex = new Map<string, number>();
  recEntries.forEach((entry, index) => {
    const text = entry.text.trim();
    if (!text) return;
    const existingPrio = bestPrioByText.get(text);
    if (existingPrio === undefined || entry.prio < existingPrio) {
      bestPrioByText.set(text, entry.prio);
    }
    if (!firstSeenIndex.has(text)) {
      firstSeenIndex.set(text, index);
    }
  });

  const recommendations = Array.from(bestPrioByText.entries())
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return (firstSeenIndex.get(a[0]) ?? 0) - (firstSeenIndex.get(b[0]) ?? 0);
    })
    .map(([text]) => text);

  // Sources: beteiligte Lizenzen mit Snapshot-Pfad und Klauselreferenzen.
  const sources: Source[] = [];
  for (const licenseId of involvedLicenseIds) {
    const license = registry.getLicense(licenseId);
    if (!license) continue;
    sources.push({
      license_id: license.id,
      snapshot_path: license.official_source.local_snapshot,
      clause_refs: license.restrictions.map((r) => r.clause_ref),
    });
  }

  return {
    overallRisk,
    complete,
    rows,
    cols,
    matrix,
    missingPairs,
    modelCodeConflicts,
    useCaseViolations,
    trainingDataFlags,
    findings,
    recommendations,
    sources,
  };
}
