import compatibilityMatrixData from "./compatibility-matrix.json";
import licensesData from "./licenses.json";
import modelsData from "./models.json";
import trainingRisksData from "./training-data-risks.json";
import useCasesData from "./use-cases.json";
import type {
  CompatibilityMatrix,
  CompatibilityPair,
  Copyleft,
  LegalIssue,
  License,
  Model,
  PatentGrant,
  TrainingDataRisk,
  UseCase,
  UseCaseId,
  YesNoConditional,
} from "./types";
import { isCuratedStatus } from "./types";

const USE_CASE_IDS: readonly UseCaseId[] = [
  "research-only",
  "internal-commercial",
  "saas-external",
  "redistribution",
];

const YES_NO_CONDITIONAL: readonly YesNoConditional[] = [
  "yes",
  "no",
  "conditional",
];

const YES_NO = ["yes", "no"] as const;

const PATENT_GRANTS: readonly PatentGrant[] = [
  "explicit",
  "implicit",
  "no_explicit",
  "none",
];

const TRAINING_RISK_LEVELS: readonly TrainingDataRisk["risk_level"][] = [
  "low",
  "medium",
  "high",
];

const COPYLEFT_VALUES: readonly Copyleft[] = [
  "none",
  "weak",
  "strong",
  "network",
];

const LICENSE_SENSITIVITY_KEYS = [
  "commercial_use_required",
  "distribution_required",
  "network_use",
  "derivative_works",
] as const;

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface RegistryInput {
  licenses: License[];
  models: Model[];
  useCases: UseCase[];
  trainingRisks: TrainingDataRisk[];
  compatibilityMatrix: CompatibilityMatrix;
}

export interface Registry {
  getLicense(id: string): License | null;
  getModel(id: string): Model | null;
  getUseCase(id: UseCaseId): UseCase | null;
  getTrainingRisk(id: string): TrainingDataRisk | null;
  findPair(licenseA: string, licenseB: string): CompatibilityPair | null;
  listLicenses(): License[];
  listModels(): Model[];
  listUseCases(): UseCase[];
  listTrainingRisks(): TrainingDataRisk[];
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function isIn<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function validateLicense(license: License): void {
  const r = license.rights;
  if (!isIn(YES_NO_CONDITIONAL, r.commercial_use)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.commercial_use: ${JSON.stringify(r.commercial_use)}`,
    );
  }
  if (!isIn(YES_NO_CONDITIONAL, r.modification)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.modification: ${JSON.stringify(r.modification)}`,
    );
  }
  if (!isIn(YES_NO_CONDITIONAL, r.distribution)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.distribution: ${JSON.stringify(r.distribution)}`,
    );
  }
  if (!isIn(YES_NO, r.private_use)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.private_use: ${JSON.stringify(r.private_use)}`,
    );
  }
  if (!isIn(PATENT_GRANTS, r.patent_grant)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.patent_grant: ${JSON.stringify(r.patent_grant)}`,
    );
  }
  if (typeof r.attribution_required !== "boolean") {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.attribution_required (kein boolean): ${JSON.stringify(r.attribution_required)}`,
    );
  }
  if (!isIn(COPYLEFT_VALUES, r.copyleft)) {
    throw new RegistryError(
      `Lizenz ${license.id} hat ungültigen rights.copyleft: ${JSON.stringify(r.copyleft)}`,
    );
  }
}

function validateUseCase(useCase: UseCase): void {
  const sens = useCase.license_sensitivity;
  for (const key of LICENSE_SENSITIVITY_KEYS) {
    if (typeof sens?.[key] !== "boolean") {
      throw new RegistryError(
        `Use-Case ${useCase.id} hat ungültigen license_sensitivity.${key} (kein boolean): ${JSON.stringify(sens?.[key])}`,
      );
    }
  }
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function validateLegalIssue(riskId: string, issue: LegalIssue, index: number): void {
  const prefix = `Training-Risk ${riskId} hat ungültigen legal_issues[${index}]`;
  if (typeof issue.issue !== "string") {
    throw new RegistryError(
      `${prefix}.issue: ${JSON.stringify(issue.issue)}`,
    );
  }
  if (typeof issue.description !== "string") {
    throw new RegistryError(
      `${prefix}.description: ${JSON.stringify(issue.description)}`,
    );
  }
  if (typeof issue.relevant_law !== "string") {
    throw new RegistryError(
      `${prefix}.relevant_law: ${JSON.stringify(issue.relevant_law)}`,
    );
  }
  if (!isNullableString(issue.leading_case)) {
    throw new RegistryError(
      `${prefix}.leading_case: ${JSON.stringify(issue.leading_case)}`,
    );
  }
  if (!isNullableString(issue.quote)) {
    throw new RegistryError(
      `${prefix}.quote: ${JSON.stringify(issue.quote)}`,
    );
  }
  if (!isNullableString(issue.clause_ref)) {
    throw new RegistryError(
      `${prefix}.clause_ref: ${JSON.stringify(issue.clause_ref)}`,
    );
  }
}

function validateTrainingRisk(risk: TrainingDataRisk): void {
  if (typeof risk.name !== "string") {
    throw new RegistryError(
      `Training-Risk ${risk.id} hat ungültigen name: ${JSON.stringify(risk.name)}`,
    );
  }
  if (!isIn(TRAINING_RISK_LEVELS, risk.risk_level)) {
    throw new RegistryError(
      `Training-Risk ${risk.id} hat ungültigen risk_level: ${JSON.stringify(risk.risk_level)}`,
    );
  }
  if (!Array.isArray(risk.legal_issues)) {
    throw new RegistryError(
      `Training-Risk ${risk.id} hat ungültige legal_issues (kein Array): ${JSON.stringify(risk.legal_issues)}`,
    );
  }
  if (risk.legal_issues.length === 0) {
    throw new RegistryError(
      `Training-Risk ${risk.id} hat ungültige legal_issues (leer)`,
    );
  }
  risk.legal_issues.forEach((issue, index) =>
    validateLegalIssue(risk.id, issue, index),
  );
  if (
    !Array.isArray(risk.mitigation_hints) ||
    risk.mitigation_hints.some((hint) => typeof hint !== "string")
  ) {
    throw new RegistryError(
      `Training-Risk ${risk.id} hat ungültige mitigation_hints: ${JSON.stringify(risk.mitigation_hints)}`,
    );
  }
}

/**
 * Lädt rohe Katalog-Daten, validiert hart und baut Indizes auf.
 *
 * Validiert werden:
 *  - Eindeutigkeit der IDs in Lizenzen, Modellen, Use-Cases, Trainings-Risiken
 *  - Coverage der UseCaseIds (alle vier Ids müssen vorhanden sein)
 *  - Referenz-Integrität: `Model.license_id` zeigt auf existierende Lizenz;
 *    `CompatibilityPair.license_a/_b` zeigen auf existierende Lizenzen
 *  - `CompatibilityPair` hat für jede UseCaseId einen gültigen Compatibility-Wert
 *  - keine doppelten Paar-Schlüssel (ungeordnet: a|b == b|a)
 *  - keine Self-Pairs in der Matrix (werden zur Laufzeit synthetisch behandelt)
 *  - `License.rights` ist für jedes entscheidungsrelevante Feld enum-konform
 *    (commercial_use, modification, distribution, private_use, patent_grant,
 *    copyleft) und `attribution_required` ist ein boolean. Grund: die Engine
 *    vergleicht diese Felder per String-Equality; ein Tippfehler bliebe sonst
 *    als Silent False Negative (UCV würde übersehen, overallRisk fälschlich
 *    green).
 *  - `UseCase.license_sensitivity` hat für alle vier Schalter einen boolean.
 *
 * Eingetragene Objekte werden zusätzlich `deepFreeze`-t. Damit lässt sich die
 * Einmal-Validierung nicht durch nachträgliche Mutation der Map-Einträge
 * (z. B. `model.license_id = "..."`) aushebeln.
 *
 * Wirft {@link RegistryError} bei jedem Verstoß.
 */
export function loadRegistry(data: RegistryInput): Registry {
  const licenseById = new Map<string, License>();
  for (const license of data.licenses) {
    if (licenseById.has(license.id)) {
      throw new RegistryError(`Lizenz-ID doppelt: ${license.id}`);
    }
    validateLicense(license);
    licenseById.set(license.id, deepFreeze(license));
  }

  const modelById = new Map<string, Model>();
  for (const model of data.models) {
    if (modelById.has(model.id)) {
      throw new RegistryError(`Model-ID doppelt: ${model.id}`);
    }
    if (!licenseById.has(model.license_id)) {
      throw new RegistryError(
        `Modell ${model.id} verweist auf unbekannte Lizenz-ID: ${model.license_id}`,
      );
    }
    modelById.set(model.id, deepFreeze(model));
  }

  const useCaseById = new Map<UseCaseId, UseCase>();
  for (const useCase of data.useCases) {
    if (useCaseById.has(useCase.id)) {
      throw new RegistryError(`Use-Case-ID doppelt: ${useCase.id}`);
    }
    validateUseCase(useCase);
    useCaseById.set(useCase.id, deepFreeze(useCase));
  }
  for (const id of USE_CASE_IDS) {
    if (!useCaseById.has(id)) {
      throw new RegistryError(`Use-Case fehlt in Registry: ${id}`);
    }
  }

  const riskById = new Map<string, TrainingDataRisk>();
  for (const risk of data.trainingRisks) {
    if (riskById.has(risk.id)) {
      throw new RegistryError(`Training-Risk-ID doppelt: ${risk.id}`);
    }
    validateTrainingRisk(risk);
    riskById.set(risk.id, deepFreeze(risk));
  }

  const pairIndex = new Map<string, CompatibilityPair>();
  for (const pair of data.compatibilityMatrix.pairs) {
    if (!licenseById.has(pair.license_a)) {
      throw new RegistryError(
        `Matrix-Paar referenziert unbekannte Lizenz-ID: ${pair.license_a}`,
      );
    }
    if (!licenseById.has(pair.license_b)) {
      throw new RegistryError(
        `Matrix-Paar referenziert unbekannte Lizenz-ID: ${pair.license_b}`,
      );
    }
    if (pair.license_a === pair.license_b) {
      throw new RegistryError(
        `Matrix-Paar mit identischen Lizenzen: ${pair.license_a}. Self-Pairs werden synthetisch behandelt und gehören nicht in die Matrix.`,
      );
    }
    const key = pairKey(pair.license_a, pair.license_b);
    if (pairIndex.has(key)) {
      throw new RegistryError(
        `Matrix-Paar doppelt (ungeordnet): ${pair.license_a} <-> ${pair.license_b}`,
      );
    }
    if (!isCuratedStatus(pair.compatibility)) {
      throw new RegistryError(
        `Matrix-Paar ${pair.license_a} <-> ${pair.license_b} hat ungültigen compatibility-Wert: ${JSON.stringify(pair.compatibility)}`,
      );
    }
    for (const ucId of USE_CASE_IDS) {
      const value = pair.scenarios?.[ucId];
      if (!isCuratedStatus(value)) {
        throw new RegistryError(
          `Matrix-Paar ${pair.license_a} <-> ${pair.license_b} hat für Use-Case "${ucId}" keinen gültigen Wert: ${JSON.stringify(value)}`,
        );
      }
    }
    pairIndex.set(key, deepFreeze(pair));
  }

  return {
    getLicense: (id) => licenseById.get(id) ?? null,
    getModel: (id) => modelById.get(id) ?? null,
    getUseCase: (id) => useCaseById.get(id) ?? null,
    getTrainingRisk: (id) => riskById.get(id) ?? null,
    findPair: (a, b) => pairIndex.get(pairKey(a, b)) ?? null,
    listLicenses: () => Array.from(licenseById.values()),
    listModels: () => Array.from(modelById.values()),
    listUseCases: () => Array.from(useCaseById.values()),
    listTrainingRisks: () => Array.from(riskById.values()),
  };
}

export const defaultRegistry: Registry = loadRegistry({
  licenses: licensesData as License[],
  models: modelsData as Model[],
  useCases: useCasesData as UseCase[],
  trainingRisks: trainingRisksData as TrainingDataRisk[],
  compatibilityMatrix: compatibilityMatrixData as CompatibilityMatrix,
});
