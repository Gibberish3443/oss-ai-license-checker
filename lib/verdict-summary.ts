import type {
  CheckResult,
  ComplianceFlagFinding,
  PairFinding,
  TrainingRiskFinding,
  UseCase,
  UseCaseId,
} from "./types";

/**
 * Regelbasiertes Fazit unter der Matrix. Keine KI, keine Freitext-Generierung:
 * Jede Zeile entsteht aus einem festen Satzbaustein, der pro Status-Kombination
 * hinterlegt ist. Damit bleibt die Ausgabe schematisch (vgl. den Hinweis unter
 * der Matrix: "keine KI-generierte Rechtseinschätzung").
 */

export type VerdictTone = "green" | "yellow" | "red" | "missing";

export interface VerdictSummary {
  tone: VerdictTone;
  headline: string;
  rationale: string[];
  nextStep: string | null;
}

type UseCaseClause = Record<UseCaseId, string>;

const USE_CASE_BLOCKER: UseCaseClause = {
  "research-only": "Für den Forschungseinsatz blockiert",
  "internal-commercial": "Für internen Betrieb blockiert",
  "saas-external": "Für SaaS-Betrieb blockiert",
  redistribution: "Für Weitergabe blockiert",
};

const USE_CASE_CONDITIONAL: UseCaseClause = {
  "research-only": "Mit Auflagen tragfähig im Forschungseinsatz",
  "internal-commercial": "Mit Auflagen tragfähig im internen Betrieb",
  "saas-external": "Mit Auflagen tragfähig im SaaS-Betrieb",
  redistribution: "Mit Auflagen tragfähig bei Weitergabe",
};

const USE_CASE_GREEN: UseCaseClause = {
  "research-only": "Tragfähig im Forschungseinsatz",
  "internal-commercial": "Tragfähig im internen Betrieb",
  "saas-external": "Tragfähig im SaaS-Betrieb",
  redistribution: "Tragfähig bei Weitergabe",
};

function isPair(finding: CheckResult["findings"][number]): finding is PairFinding {
  return finding.kind === "pair";
}

function isTraining(
  finding: CheckResult["findings"][number],
): finding is TrainingRiskFinding {
  return finding.kind === "training-data";
}

function isCompliance(
  finding: CheckResult["findings"][number],
): finding is ComplianceFlagFinding {
  return finding.kind === "compliance";
}

function topPairs(findings: readonly PairFinding[], limit: number): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const finding of findings) {
    const label = `${finding.model_license_name} × ${finding.dependency_license_name}`;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= limit) break;
  }
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} und ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} und ${labels[labels.length - 1]}`;
}

function buildHeadline(result: CheckResult, useCase: UseCase): string {
  if (result.overallRisk === "missing") return "Prüfung unvollständig";
  if (result.overallRisk === "red") return USE_CASE_BLOCKER[useCase.id];
  if (result.overallRisk === "yellow") return USE_CASE_CONDITIONAL[useCase.id];
  return USE_CASE_GREEN[useCase.id];
}

function buildRationale(
  result: CheckResult,
  conflicts: readonly PairFinding[],
  notices: readonly PairFinding[],
  training: readonly TrainingRiskFinding[],
  compliance: readonly ComplianceFlagFinding[],
): string[] {
  const trainingConflicts = training.filter((f) => f.severity === "conflict");
  const lines: string[] = [];

  if (conflicts.length > 0) {
    const label = conflicts.length === 1 ? "Paar kollidiert" : "Paare kollidieren";
    const top = topPairs(conflicts, 2);
    lines.push(
      `${conflicts.length} ${label} im gewählten Use-Case (${top}).`,
    );
  }

  if (notices.length > 0) {
    const label = notices.length === 1 ? "Paar trägt" : "Paare tragen";
    lines.push(
      `${notices.length} ${label} Auflagen (Nennungs-, NOTICE- oder Schwellenklauseln).`,
    );
  }

  if (trainingConflicts.length > 0) {
    const top = trainingConflicts
      .slice(0, 2)
      .map((f) => f.risk_name)
      .join(", ");
    lines.push(
      `Trainingsdaten-Risiken treffen diesen Use-Case direkt (${top}).`,
    );
  } else if (training.length > 0) {
    lines.push(
      `${training.length} Trainingsdaten-Hinweis${training.length === 1 ? "" : "e"} als Kontext dokumentiert.`,
    );
  }

  if (compliance.length > 0) {
    lines.push(
      `${compliance.length} Modell${compliance.length === 1 ? "" : "e"} mit zusätzlichen Compliance-Flags (Entity-List, Hardware-Origin, Jurisdiction).`,
    );
  }

  if (result.missingPairs.length > 0) {
    lines.push(
      `${result.missingPairs.length} Lizenzpaar${result.missingPairs.length === 1 ? "" : "e"} ungeprüft — Ergebnis nicht abschließend.`,
    );
  }

  return lines.slice(0, 3);
}

function buildNextStep(
  result: CheckResult,
  conflicts: readonly PairFinding[],
  notices: readonly PairFinding[],
): string | null {
  if (result.overallRisk === "missing") {
    return "Fehlende Paare manuell prüfen; bis dahin kein Produktivbetrieb.";
  }

  if (result.overallRisk === "red") {
    if (conflicts.length > 0) {
      return "Ersetze eine der Konflikt-Lizenzen oder wechsle den Use-Case, unter dem sie trägt.";
    }
    return "Lizenzanforderungen des Use-Case nicht erfüllt; wähle eine geeignete Alternative.";
  }

  if (result.overallRisk === "yellow") {
    if (notices.length > 0) {
      return "Auflagen vor Produktiveinsatz dokumentieren und in den Release-Check aufnehmen.";
    }
    return "Bedingungen prüfen und im Release-Check verankern.";
  }

  return null;
}

export function buildVerdictSummary(
  result: CheckResult,
  useCase: UseCase,
): VerdictSummary {
  const conflicts = result.findings.filter(isPair).filter(
    (f) => f.severity === "conflict",
  );
  const notices = result.findings.filter(isPair).filter(
    (f) => f.severity === "notice",
  );
  const training = result.findings.filter(isTraining);
  const compliance = result.findings.filter(isCompliance);

  return {
    tone: result.overallRisk,
    headline: buildHeadline(result, useCase),
    rationale: buildRationale(result, conflicts, notices, training, compliance),
    nextStep: buildNextStep(result, conflicts, notices),
  };
}
