import { describe, expect, it } from "vitest";

import { runCheck } from "@/lib/check-engine";
import { defaultRegistry } from "@/lib/registry";
import { buildVerdictSummary } from "@/lib/verdict-summary";
import type { UseCase, UseCaseId } from "@/lib/types";

function getUseCase(id: UseCaseId): UseCase {
  const value = defaultRegistry.getUseCase(id);
  if (!value) throw new Error(`UseCase fehlt: ${id}`);
  return value;
}

describe("buildVerdictSummary", () => {
  it("MIT × MIT unter internal-commercial: grün, ohne Next-Step", () => {
    const models = ["phi-4-reasoning-plus"];
    const result = runCheck({
      models,
      codeDependencies: ["mit"],
      trainingData: [],
      useCase: "internal-commercial",
    });

    const summary = buildVerdictSummary(result, getUseCase("internal-commercial"));

    expect(summary.tone).toBe("green");
    expect(summary.headline).toBe("Tragfähig im internen Betrieb");
    expect(summary.nextStep).toBeNull();
    expect(summary.rationale).toEqual([]);
  });

  it("AGPL × SaaS-external: rot mit Konflikt-Rationale", () => {
    const result = runCheck({
      models: ["llama-4-maverick"],
      codeDependencies: ["agpl-3-0"],
      trainingData: [],
      useCase: "saas-external",
    });

    const summary = buildVerdictSummary(result, getUseCase("saas-external"));

    expect(summary.tone).toBe("red");
    expect(summary.headline).toBe("Für SaaS-Betrieb blockiert");
    expect(summary.rationale.length).toBeGreaterThan(0);
    expect(summary.rationale[0]).toMatch(/kollidier/);
    expect(summary.nextStep).toMatch(/Ersetze/);
  });

  it("missing-Pair: Fazit markiert unvollständige Prüfung", () => {
    const result = {
      overallRisk: "missing" as const,
      complete: false,
      rows: [],
      cols: [],
      matrix: [],
      missingPairs: [
        { license_a: "foo", license_b: "bar", context: "test" },
        { license_a: "baz", license_b: "qux", context: "test" },
      ],
      modelCodeConflicts: [],
      useCaseViolations: [],
      trainingDataFlags: [],
      findings: [],
      recommendations: [],
      sources: [],
    };

    const summary = buildVerdictSummary(result, getUseCase("redistribution"));

    expect(summary.tone).toBe("missing");
    expect(summary.headline).toBe("Prüfung unvollständig");
    expect(summary.rationale.some((line) => line.includes("ungeprüft"))).toBe(
      true,
    );
    expect(summary.nextStep).toMatch(/manuell prüfen/);
  });

  it("rationale wird auf drei Zeilen gekappt", () => {
    const result = runCheck({
      models: ["llama-4-maverick"],
      codeDependencies: ["agpl-3-0", "gpl-3-0"],
      trainingData: ["web-crawl", "github-code"],
      useCase: "saas-external",
    });

    const summary = buildVerdictSummary(result, getUseCase("saas-external"));

    expect(summary.rationale.length).toBeLessThanOrEqual(3);
  });

  it("Headline-Bausteine decken alle vier Use-Cases ab", () => {
    const greenCases: UseCaseId[] = [
      "research-only",
      "internal-commercial",
      "saas-external",
      "redistribution",
    ];

    for (const id of greenCases) {
      const result = runCheck({
        models: ["phi-4-reasoning-plus"],
        codeDependencies: ["mit"],
        trainingData: [],
        useCase: id,
      });
      const summary = buildVerdictSummary(result, getUseCase(id));
      expect(summary.headline).not.toBe("");
      expect(summary.headline).not.toMatch(/undefined/i);
    }
  });
});
