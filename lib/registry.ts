import compatibilityMatrixData from "./compatibility-matrix.json";
import licensesData from "./licenses.json";
import modelsData from "./models.json";
import trainingRisksData from "./training-data-risks.json";
import useCasesData from "./use-cases.json";
import type {
  Compatibility,
  CompatibilityMatrix,
  CompatibilityPair,
  License,
  Model,
  TrainingDataRisk,
  UseCase,
  UseCaseId,
} from "./types";

const USE_CASE_IDS: readonly UseCaseId[] = [
  "research-only",
  "internal-commercial",
  "saas-external",
  "redistribution",
];

const COMPATIBILITY_VALUES: readonly Compatibility[] = [
  "compatible",
  "conditional",
  "incompatible",
];

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
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
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function isCompatibility(value: unknown): value is Compatibility {
  return (
    typeof value === "string" &&
    (COMPATIBILITY_VALUES as readonly string[]).includes(value)
  );
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
 *
 * Nicht validiert werden Struktur-Details einzelner Felder (z. B. ob
 * `license.rights.copyleft` tatsächlich ein gültiger String ist). Die JSONs
 * werden beim TypeScript-Import weiterhin als typisiert angenommen; der
 * Validator deckt die Fehlerklassen ab, die in der Praxis bei manueller
 * Kuration auftreten und still durchrutschen können.
 *
 * Wirft {@link RegistryError} bei jedem Verstoß.
 */
export function loadRegistry(data: RegistryInput): Registry {
  const licenseById = new Map<string, License>();
  for (const license of data.licenses) {
    if (licenseById.has(license.id)) {
      throw new RegistryError(`Lizenz-ID doppelt: ${license.id}`);
    }
    licenseById.set(license.id, license);
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
    modelById.set(model.id, model);
  }

  const useCaseById = new Map<UseCaseId, UseCase>();
  for (const useCase of data.useCases) {
    if (useCaseById.has(useCase.id)) {
      throw new RegistryError(`Use-Case-ID doppelt: ${useCase.id}`);
    }
    useCaseById.set(useCase.id, useCase);
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
    riskById.set(risk.id, risk);
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
    for (const ucId of USE_CASE_IDS) {
      const value = pair.scenarios?.[ucId];
      if (!isCompatibility(value)) {
        throw new RegistryError(
          `Matrix-Paar ${pair.license_a} <-> ${pair.license_b} hat für Use-Case "${ucId}" keinen gültigen Wert: ${JSON.stringify(value)}`,
        );
      }
    }
    pairIndex.set(key, pair);
  }

  return {
    getLicense: (id) => licenseById.get(id) ?? null,
    getModel: (id) => modelById.get(id) ?? null,
    getUseCase: (id) => useCaseById.get(id) ?? null,
    getTrainingRisk: (id) => riskById.get(id) ?? null,
    findPair: (a, b) => pairIndex.get(pairKey(a, b)) ?? null,
    listLicenses: () => Array.from(licenseById.values()),
    listModels: () => Array.from(modelById.values()),
  };
}

export const defaultRegistry: Registry = loadRegistry({
  licenses: licensesData as License[],
  models: modelsData as Model[],
  useCases: useCasesData as UseCase[],
  trainingRisks: trainingRisksData as TrainingDataRisk[],
  compatibilityMatrix: compatibilityMatrixData as CompatibilityMatrix,
});
