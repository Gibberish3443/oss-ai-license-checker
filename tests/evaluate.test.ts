import { describe, expect, it } from "vitest";

import { evaluateCompatibility } from "@/lib/evaluate";
import { defaultRegistry } from "@/lib/registry";
import type { Finding, License } from "@/lib/types";

function license(id: string): License {
  const value = defaultRegistry.getLicense(id);
  if (!value) throw new Error(`Testlizenz fehlt: ${id}`);
  return value;
}

function pairFindings(findings: Finding[]) {
  return findings.filter((finding) => finding.kind === "pair");
}

describe("evaluateCompatibility", () => {
  it("MIT x MIT bleibt in jedem Use-Case ohne Finding", () => {
    const mit = license("mit");
    const useCases = defaultRegistry.listUseCases();

    for (const useCase of useCases) {
      const findings = evaluateCompatibility([mit], [mit], [], useCase);

      expect(pairFindings(findings)).toHaveLength(0);
    }
  });

  it("AGPL x SaaS aktiviert die Netzwerkklausel als Konflikt", () => {
    const findings = evaluateCompatibility(
      [license("agpl-3-0")],
      [license("mit")],
      [],
      "saas_external",
    );

    const pair = pairFindings(findings)[0];
    expect(pair).toBeDefined();
    expect(pair?.severity).toBe("conflict");
    expect(pair?.clause.restriction_id).toBe("agpl3-network");
    expect(pair?.clause.source_label).toBe(
      "GNU Affero General Public License v3.0 Section 13",
    );
  });

  it("Llama 4 x Redistribution bleibt Hinweis mit MAU-Klausel", () => {
    const model = defaultRegistry.getModel("llama-4-maverick");
    expect(model).not.toBeNull();
    if (!model) throw new Error("llama-4-maverick fehlt");

    const findings = evaluateCompatibility(
      [model],
      [license("apache-2-0")],
      [],
      "redistribution",
    );

    const pair = pairFindings(findings)[0];
    expect(pair).toBeDefined();
    expect(pair?.severity).toBe("notice");
    expect(pair?.clause.restriction_id).toBe("llama4-mau-threshold");
    expect(pair?.recommendation.toLowerCase()).toContain("separatlizenz");
  });

  it("Apache x MIT ist internal-commercial OK", () => {
    const findings = evaluateCompatibility(
      [license("apache-2-0")],
      [license("mit")],
      [],
      "internal-commercial",
    );

    expect(pairFindings(findings)).toHaveLength(0);
  });

  it("Klauselzitate sind kurz und mit Lizenz plus Abschnitt belegt", () => {
    const findings = evaluateCompatibility(
      [license("agpl-3-0")],
      [license("mit")],
      [],
      "saas-external",
    );

    const pair = pairFindings(findings)[0];
    expect(pair).toBeDefined();
    expect(pair?.clause.quote.trim().split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(pair?.clause.source_label).toContain(pair?.clause.license_name);
    expect(pair?.clause.source_label).toContain(pair?.clause.clause_ref);
    expect(pair?.clause.source_path).toMatch(/^licenses\/raw\//);
  });
});
