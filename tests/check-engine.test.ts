import { describe, expect, it } from "vitest";

import { EngineInputError, runCheck } from "@/lib/check-engine";
import compatibilityMatrixData from "@/lib/compatibility-matrix.json";
import licensesData from "@/lib/licenses.json";
import modelsData from "@/lib/models.json";
import {
  loadRegistry,
  RegistryError,
  type RegistryInput,
} from "@/lib/registry";
import trainingRisksData from "@/lib/training-data-risks.json";
import type {
  CheckInput,
  CompatibilityMatrix,
  License,
  Model,
  TrainingDataRisk,
  UseCase,
} from "@/lib/types";
import useCasesData from "@/lib/use-cases.json";

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

function expectThrown<T extends Error>(
  fn: () => unknown,
  errorType: new (...args: never[]) => T,
): T {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(errorType);
    return error as T;
  }

  throw new Error("Fehler erwartet, aber kein Throw");
}

describe("runCheck", () => {
  describe("Engine-Szenarien", () => {
    it("A: gemma-4 mit permissivem Code und web-crawl bleibt gelb", () => {
      const result = runCheck({
        models: ["gemma-4-31b"],
        codeDependencies: ["mit", "apache-2-0", "bsd-3-clause"],
        trainingData: ["web-crawl"],
        useCase: "internal-commercial",
      });

      expect(result.complete).toBe(true);
      expect(result.overallRisk).toBe("yellow");
      expect(result.rows).toHaveLength(1);
      expect(result.cols).toHaveLength(3);
      expect(result.trainingDataFlags).toHaveLength(1);
      expect(result.trainingDataFlags[0]?.reason).toContain('"web-crawl"');
      expect(result.trainingDataFlags[0]?.reason).toContain(
        '"commercial_use_required"',
      );
    });

    it("B: llama-4-maverick bleibt im SaaS-Use-Case conditional", () => {
      const result = runCheck({
        models: ["llama-4-maverick"],
        codeDependencies: ["apache-2-0"],
        trainingData: [],
        useCase: "saas-external",
      });

      expect(result.complete).toBe(true);
      expect(result.overallRisk).toBe("yellow");
      expect(
        result.modelCodeConflicts.some((conflict) => conflict.severity === "medium"),
      ).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("C: self-pair erzeugt keine Konflikte", () => {
      const result = runCheck({
        models: ["qwen3-235b"],
        codeDependencies: ["apache-2-0"],
        trainingData: [],
        useCase: "research-only",
      });

      expect(result.complete).toBe(true);
      expect(result.matrix[0]?.[0]?.status).toBe("self");
      expect(result.modelCodeConflicts).toHaveLength(0);
      expect(result.overallRisk).toBe("green");
    });

    it("D: fehlende Matrix-Paare schlagen als missing durch", () => {
      const result = runCheck({
        models: ["deepseek-v3-2"],
        codeDependencies: ["bsl-1-0"],
        trainingData: [],
        useCase: "internal-commercial",
      });

      expect(result.overallRisk).toBe("missing");
      expect(result.complete).toBe(false);
      expect(result.missingPairs.length).toBeGreaterThanOrEqual(1);
      expect(result.matrix[0]?.[0]?.status).toBe("missing");
      expect(
        result.recommendations.some((text) =>
          text.toLowerCase().includes("nicht kuratiert"),
        ),
      ).toBe(true);
    });

    it("E: doppelte Dependencies werden in Spalten und Empfehlungen dedupliziert", () => {
      const result = runCheck({
        models: ["llama-4-maverick"],
        codeDependencies: ["apache-2-0", "apache-2-0", "mit"],
        trainingData: [],
        useCase: "saas-external",
      });

      expect(result.cols).toHaveLength(2);
      expect(
        result.cols.find((column) => column.license_id === "apache-2-0")?.dep_count,
      ).toBe(2);
      expect(new Set(result.recommendations).size).toBe(
        result.recommendations.length,
      );
    });

    it("F: Use-Case-Verletzungen funktionieren auch ohne Matrixzellen", () => {
      const result = runCheck({
        models: [],
        codeDependencies: ["flux-1-dev-nc"],
        trainingData: [],
        useCase: "internal-commercial",
      });

      expect(result.rows).toHaveLength(0);
      expect(result.matrix).toHaveLength(0);
      expect(result.complete).toBe(true);
      expect(
        result.useCaseViolations.some(
          (violation) =>
            violation.license_id === "flux-1-dev-nc" &&
            violation.severity === "high",
        ),
      ).toBe(true);
      expect(result.overallRisk).toBe("red");
    });

    it("G: missing hat Vorrang vor gelb aus Trainingsdaten", () => {
      const result = runCheck({
        models: ["deepseek-v3-2"],
        codeDependencies: ["bsl-1-0"],
        trainingData: ["web-crawl"],
        useCase: "internal-commercial",
      });

      expect(result.overallRisk).toBe("missing");
      expect(result.missingPairs.length).toBeGreaterThanOrEqual(1);
      expect(result.trainingDataFlags).toHaveLength(1);
    });

    it("direkte incompatible-Matrixpaare setzen overallRisk auf rot", () => {
      const result = runCheck({
        models: ["qwen3-235b"],
        codeDependencies: ["gpl-2-0"],
        trainingData: [],
        useCase: "internal-commercial",
      });

      expect(result.overallRisk).toBe("red");
      expect(
        result.modelCodeConflicts.some((conflict) => conflict.severity === "high"),
      ).toBe(true);
      expect(result.matrix[0]?.[0]?.status).toBe("incompatible");
    });

    it("AGPL-Netzwerk-Copyleft erzeugt im SaaS-Use-Case eine medium-UCV", () => {
      const result = runCheck({
        models: [],
        codeDependencies: ["agpl-3-0"],
        trainingData: [],
        useCase: "saas-external",
      });

      expect(
        result.useCaseViolations.some(
          (violation) =>
            violation.license_id === "agpl-3-0" &&
            violation.severity === "medium" &&
            violation.violation.includes("Network-Copyleft"),
        ),
      ).toBe(true);
      expect(result.overallRisk).toBe("yellow");
    });

    it("fehlende Paar-Empfehlungen werden spiegelbildlich dedupliziert", () => {
      const input = cloneInput();
      input.compatibilityMatrix.pairs = input.compatibilityMatrix.pairs.filter(
        (pair) =>
          !(
            (pair.license_a === "apache-2-0" && pair.license_b === "mit") ||
            (pair.license_a === "mit" && pair.license_b === "apache-2-0")
          ),
      );
      const registry = loadRegistry(input);

      const result = runCheck(
        {
          models: ["deepseek-v3-2", "qwen3-235b"],
          codeDependencies: ["apache-2-0", "mit"],
          trainingData: [],
          useCase: "internal-commercial",
        },
        registry,
      );

      const missingRecommendations = result.recommendations.filter((text) =>
        text.includes("nicht kuratiert"),
      );

      expect(result.missingPairs).toHaveLength(2);
      expect(missingRecommendations).toEqual([
        "Matrix-Paar apache-2-0 <-> mit ist nicht kuratiert und muss vor Produktiveinsatz manuell bewertet werden.",
      ]);
    });

    it("recommendations bleiben nach Priorität und First-Seen sortiert", () => {
      const result = runCheck({
        models: ["llama-4-maverick"],
        codeDependencies: ["apache-2-0"],
        trainingData: ["web-crawl"],
        useCase: "saas-external",
      });

      expect(result.recommendations[0]).toBe(
        "NOTICE-File + Llama-Agreement bei Distribution beilegen",
      );
      expect(result.recommendations[1]).toBe(
        "Apache-Patent-Retaliation und Llama-Patent-Termination-Klausel wirken getrennt",
      );
      expect(
        result.recommendations.indexOf(
          "Nur Modelle mit dokumentiertem Crawl-Zeitraum und Opt-out-Respektierung einsetzen",
        ),
      ).toBeGreaterThan(1);
    });

    it("sources folgen der Reihenfolge Modelle zuerst, dann neue Code-Lizenzen", () => {
      const result = runCheck({
        models: ["deepseek-v3-2"],
        codeDependencies: ["apache-2-0", "bsd-3-clause", "mit"],
        trainingData: [],
        useCase: "internal-commercial",
      });

      expect(result.sources.map((source) => source.license_id)).toEqual([
        "mit",
        "apache-2-0",
        "bsd-3-clause",
      ]);
      expect(result.sources[0]?.snapshot_path).toBe("osi_mit_2026-04-23.html");
      expect(result.sources[1]?.snapshot_path).toBe(
        "apache_license-2-0_2026-04-23.txt",
      );
      expect(result.sources[0]?.clause_refs).toContain("Paragraph 2");
    });

    it("Trainingsdaten-Begründungen bleiben lesbar ohne aktive Sensitivity-Schalter", () => {
      const input = cloneInput();
      const researchOnly = input.useCases.find(
        (useCase) => useCase.id === "research-only",
      );

      expect(researchOnly).toBeDefined();
      if (!researchOnly) {
        throw new Error("research-only fehlt in der Test-Registry");
      }

      researchOnly.license_sensitivity = {
        commercial_use_required: false,
        distribution_required: false,
        network_use: false,
        derivative_works: false,
      };

      const result = runCheck(
        {
          models: [],
          codeDependencies: [],
          trainingData: ["web-crawl"],
          useCase: "research-only",
        },
        loadRegistry(input),
      );

      expect(result.trainingDataFlags[0]?.reason).toContain(
        "kein expliziter license_sensitivity-Schalter aktiv",
      );
      expect(result.trainingDataFlags[0]?.reason).not.toContain(
        "aktiven Use-Case-Schaltern ",
      );
      expect(result.trainingDataFlags[0]?.reason).not.toContain("sind .");
    });
  });

  describe("Input-Validierung", () => {
    it("H1: unbekannte Model-ID wirft EngineInputError", () => {
      const error = expectThrown(
        () =>
          runCheck({
            models: ["kein-modell-xyz"],
            codeDependencies: ["mit"],
            trainingData: [],
            useCase: "internal-commercial",
          }),
        EngineInputError,
      );

      expect(error.message).toContain("kein-modell-xyz");
    });

    it("H2: unbekannte Code-Lizenz-ID wirft EngineInputError", () => {
      const error = expectThrown(
        () =>
          runCheck({
            models: ["qwen3-235b"],
            codeDependencies: ["keine-lizenz-xyz"],
            trainingData: [],
            useCase: "internal-commercial",
          }),
        EngineInputError,
      );

      expect(error.message).toContain("keine-lizenz-xyz");
    });

    it("H3: unbekannte Training-Risk-ID wirft EngineInputError", () => {
      const error = expectThrown(
        () =>
          runCheck({
            models: ["qwen3-235b"],
            codeDependencies: ["mit"],
            trainingData: ["kein-risiko-xyz"],
            useCase: "internal-commercial",
          }),
        EngineInputError,
      );

      expect(error.message).toContain("kein-risiko-xyz");
    });

    it("Regression: ungültige Eingaben bleiben EngineInputError", () => {
      const invalidInputs: CheckInput[] = [
        {
          models: ["kein-modell-xyz"],
          codeDependencies: ["mit"],
          trainingData: [],
          useCase: "internal-commercial",
        },
        {
          models: ["qwen3-235b"],
          codeDependencies: ["keine-lizenz-xyz"],
          trainingData: [],
          useCase: "internal-commercial",
        },
        {
          models: ["qwen3-235b"],
          codeDependencies: ["mit"],
          trainingData: ["kein-risiko-xyz"],
          useCase: "internal-commercial",
        },
        {
          models: ["qwen3-235b"],
          codeDependencies: ["mit"],
          trainingData: [],
          useCase: "redistribution-invalid" as CheckInput["useCase"],
        },
      ];

      for (const input of invalidInputs) {
        const error = expectThrown(() => runCheck(input), EngineInputError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});

describe("loadRegistry", () => {
  describe("Negativfälle", () => {
    it("RegistryError bleibt per instanceof erkennbar", () => {
      const error = new RegistryError("kaputt");

      expect(error).toBeInstanceOf(RegistryError);
      expect(error).toBeInstanceOf(Error);
    });

    it("R1: doppelte Paare werden ungeordnet erkannt", () => {
      const input = cloneInput();
      const original = input.compatibilityMatrix.pairs[0];

      input.compatibilityMatrix.pairs.push({
        ...original,
        license_a: original.license_b,
        license_b: original.license_a,
      });

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message.toLowerCase()).toContain("doppelt");
    });

    it("R2: fehlende scenarios-Keys werden erkannt", () => {
      const input = cloneInput();
      const pair = input.compatibilityMatrix.pairs[0];

      delete (pair.scenarios as Partial<typeof pair.scenarios>)["saas-external"];

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("saas-external");
    });

    it("R3: ungültige scenarios-Werte werden erkannt", () => {
      const input = cloneInput();
      const pair = input.compatibilityMatrix.pairs[0];

      (pair.scenarios as Record<string, string>)["redistribution"] = "maybe";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("redistribution");
    });

    it("zusätzlich: ungültige compatibility-Werte werden erkannt", () => {
      const input = cloneInput();
      const pair = input.compatibilityMatrix.pairs[0];

      (pair as unknown as Record<string, unknown>).compatibility = "maybe";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("compatibility");
    });

    it("R4: unbekannte Lizenz-Referenzen in der Matrix werden erkannt", () => {
      const input = cloneInput();
      input.compatibilityMatrix.pairs[0].license_a = "lizenz-existiert-nicht";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("lizenz-existiert-nicht");
    });

    it("R5: self-pairs in der Matrix werden erkannt", () => {
      const input = cloneInput();
      input.compatibilityMatrix.pairs[0].license_b =
        input.compatibilityMatrix.pairs[0].license_a;

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message.toLowerCase()).toContain("identisch");
    });

    it("R6: Modelle mit unbekannter license_id werden erkannt", () => {
      const input = cloneInput();
      input.models[0].license_id = "lizenz-existiert-nicht";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("lizenz-existiert-nicht");
    });

    it("R7: fehlende Use-Cases werden erkannt", () => {
      const input = cloneInput();
      input.useCases = input.useCases.filter(
        (useCase) => useCase.id !== "redistribution",
      );

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("redistribution");
    });

    it("R8: ungültige rights-Enums werden erkannt", () => {
      const input = cloneInput();
      (input.licenses[0].rights as unknown as Record<string, unknown>).commercial_use =
        "maybe";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("commercial_use");
    });

    it("R9: attribution_required ohne boolean wird erkannt", () => {
      const input = cloneInput();
      (
        input.licenses[0].rights as unknown as Record<string, unknown>
      ).attribution_required = "ja";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("attribution_required");
    });

    it("R10: ungültige license_sensitivity-Werte werden erkannt", () => {
      const input = cloneInput();
      (
        input.useCases[0].license_sensitivity as unknown as Record<string, unknown>
      ).commercial_use_required = "ja";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("commercial_use_required");
    });

    it("R11: Registry-Entries bleiben deep-frozen", () => {
      const registry = loadRegistry(cloneInput());
      const license = registry.getLicense("mit");

      expect(license).not.toBeNull();
      expect(Object.isFrozen(license)).toBe(true);
      expect(Object.isFrozen(license?.rights)).toBe(true);
    });

    it("Training-Risks mit ungültigem risk_level werden erkannt", () => {
      const input = cloneInput();
      (
        input.trainingRisks[0] as unknown as Record<string, unknown>
      ).risk_level = "kritisch";

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("risk_level");
    });

    it("Training-Risks mit ungültigen legal_issues werden erkannt", () => {
      const input = cloneInput();
      (
        input.trainingRisks[0].legal_issues[0] as unknown as Record<string, unknown>
      ).issue = 42;

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("legal_issues[0].issue");
    });

    it("Training-Risks ohne legal_issues werden erkannt", () => {
      const input = cloneInput();
      input.trainingRisks[0].legal_issues = [];

      const error = expectThrown(() => loadRegistry(input), RegistryError);
      expect(error.message).toContain("legal_issues");
    });
  });
});
