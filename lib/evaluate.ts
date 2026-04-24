import { defaultRegistry, type Registry } from "./registry";
import type {
  Compatibility,
  CompatibilityPair,
  ClauseEvidence,
  Finding,
  FindingSeverity,
  License,
  LicenseRestriction,
  Model,
  TrainingDataRisk,
  UseCase,
  UseCaseId,
} from "./types";

type UseCaseAlias =
  | UseCaseId
  | "research"
  | "research_only"
  | "internal_commercial"
  | "saas_external";

type UseCaseLike = UseCase | UseCaseAlias;
type ModelLike = Model | License;

interface ResolvedModelGroup {
  license: License;
  modelIds: string[];
  modelNames: string[];
}

interface ClauseMatch {
  license: License;
  restriction: LicenseRestriction;
  severity: FindingSeverity;
  explanation: string;
  recommendation: string;
}

const USE_CASE_ALIASES: Record<string, UseCaseId> = {
  research: "research-only",
  research_only: "research-only",
  "research-only": "research-only",
  internal_commercial: "internal-commercial",
  "internal-commercial": "internal-commercial",
  saas_external: "saas-external",
  "saas-external": "saas-external",
  redistribution: "redistribution",
};

function normalizeUseCaseId(useCase: UseCaseLike): UseCaseId {
  const raw = typeof useCase === "string" ? useCase : useCase.id;
  return USE_CASE_ALIASES[raw] ?? (raw as UseCaseId);
}

function isLicense(value: ModelLike): value is License {
  return "rights" in value && "restrictions" in value;
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function resolveModelGroups(
  models: readonly ModelLike[],
  lookup: Registry,
): ResolvedModelGroup[] {
  const groups = new Map<string, ResolvedModelGroup>();

  for (const model of models) {
    const license = isLicense(model) ? model : lookup.getLicense(model.license_id);
    if (!license) continue;

    const id = isLicense(model) ? license.id : model.id;
    const name = isLicense(model) ? license.name : model.name;
    const existing = groups.get(license.id);
    if (existing) {
      existing.modelIds.push(id);
      existing.modelNames.push(name);
      continue;
    }

    groups.set(license.id, {
      license,
      modelIds: [id],
      modelNames: [name],
    });
  }

  return Array.from(groups.values());
}

function quoteWordCount(quote: string): number {
  return quote.trim().split(/\s+/).filter(Boolean).length;
}

function quoteExcerpt(quote: string | null): string {
  if (!quote) return "";
  const words = quote.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 15).join(" ");
}

function evidence(
  license: License,
  restriction: LicenseRestriction,
): ClauseEvidence {
  const quote = quoteExcerpt(restriction.quote);
  return {
    license_id: license.id,
    license_name: license.name,
    restriction_id: restriction.id,
    clause_ref: restriction.clause_ref,
    quote,
    source_path: `licenses/raw/${license.official_source.local_snapshot}`,
    source_label: `${license.name} ${restriction.clause_ref}`,
  };
}

function hasQuote(match: ClauseMatch | null): match is ClauseMatch {
  return Boolean(match?.restriction.quote && quoteWordCount(match.restriction.quote) > 0);
}

function findRestriction(
  licenses: readonly License[],
  predicate: (license: License, restriction: LicenseRestriction) => boolean,
): { license: License; restriction: LicenseRestriction } | null {
  for (const license of licenses) {
    for (const restriction of license.restrictions) {
      if (restriction.quote && predicate(license, restriction)) {
        return { license, restriction };
      }
    }
  }
  return null;
}

function restrictionText(restriction: LicenseRestriction): string {
  return `${restriction.id} ${restriction.clause_ref} ${restriction.effect}`.toLowerCase();
}

function isNetworkClause(
  license: License,
  restriction: LicenseRestriction,
): boolean {
  return license.rights.copyleft === "network" || restriction.id.includes("network");
}

function isThresholdClause(
  license: License,
  restriction: LicenseRestriction,
  vendor: "llama" | "gemma",
): boolean {
  const haystack = restrictionText(restriction);
  return (
    license.id.includes(vendor) &&
    (haystack.includes("mau") ||
      haystack.includes("monthly active") ||
      haystack.includes("threshold") ||
      haystack.includes("million"))
  );
}

function isNoticeClause(
  _license: License,
  restriction: LicenseRestriction,
): boolean {
  const haystack = restrictionText(restriction);
  return haystack.includes("notice") || haystack.includes("redistribution");
}

function isAttributionClause(
  license: License,
  restriction: LicenseRestriction,
): boolean {
  const haystack = restrictionText(restriction);
  return (
    license.rights.attribution_required &&
    (haystack.includes("attribution") ||
      haystack.includes("copyright") ||
      haystack.includes("permission notice") ||
      haystack.includes("redistribution"))
  );
}

function isCopyleftClause(
  license: License,
  restriction: LicenseRestriction,
): boolean {
  const haystack = restrictionText(restriction);
  return (
    license.rights.copyleft !== "none" &&
    (haystack.includes("copyleft") ||
      haystack.includes("entire work") ||
      haystack.includes("source") ||
      haystack.includes("library"))
  );
}

function isCommercialLimitClause(
  license: License,
  restriction: LicenseRestriction,
): boolean {
  const haystack = restrictionText(restriction);
  return (
    license.rights.commercial_use !== "yes" &&
    (haystack.includes("commercial") ||
      haystack.includes("research") ||
      haystack.includes("revenue") ||
      haystack.includes("mau") ||
      haystack.includes("restricted use") ||
      haystack.includes("prohibited"))
  );
}

function activeUseCaseClause(
  modelLicense: License,
  dependencyLicense: License,
  useCase: UseCaseId,
  sameLicense: boolean,
): ClauseMatch | null {
  const licenses = [modelLicense, dependencyLicense];

  if (useCase === "saas-external") {
    const agplNetwork = findRestriction(licenses, isNetworkClause);
    if (agplNetwork) {
      return {
        ...agplNetwork,
        severity: "conflict",
        explanation:
          "Hosted SaaS aktiviert die AGPL-Netzwerkklausel; der Quellcode muss Nutzern des Dienstes angeboten werden.",
        recommendation:
          "Setze AGPL-Code nicht in einem geschlossenen SaaS ein oder plane ein vollstaendiges Source-Angebot fuer Endnutzer ein.",
      };
    }

    const llamaMau = findRestriction(licenses, (license, restriction) =>
      isThresholdClause(license, restriction, "llama"),
    );
    if (llamaMau) {
      return {
        ...llamaMau,
        severity: "notice",
        explanation:
          "Bei sehr grosser Reichweite ist die Llama-Nutzung nicht mehr automatisch durch die Community-Lizenz gedeckt.",
        recommendation:
          "Miss MAU fuer das Produkt; oberhalb der Schwelle vor Nutzung eine Meta-Separatlizenz einholen.",
      };
    }

    const gemmaMau = findRestriction(licenses, (license, restriction) =>
      isThresholdClause(license, restriction, "gemma"),
    );
    if (gemmaMau) {
      return {
        ...gemmaMau,
        severity: "notice",
        explanation:
          "Der SaaS-Use-Case macht die Gemma-Schwellenklausel relevant, sofern der Katalog sie fuer diese Lizenz ausweist.",
        recommendation:
          "Pruefe die MAU-Schwelle vor externer Bereitstellung und dokumentiere das Ergebnis im Release-Check.",
      };
    }
  }

  if (useCase === "redistribution" && !sameLicense) {
    const llamaMau = findRestriction(licenses, (license, restriction) =>
      isThresholdClause(license, restriction, "llama"),
    );
    if (llamaMau) {
      return {
        ...llamaMau,
        severity: "notice",
        explanation:
          "Redistribution aendert die Lizenz nicht, aber die Llama-Schwelle bleibt als kommerzielle Bedingung bestehen.",
        recommendation:
          "Lege das Llama Agreement bei und pruefe vor Distribution, ob die MAU-Schwelle eine Separatlizenz erfordert.",
      };
    }

    const notice = findRestriction(licenses, isNoticeClause);
    if (notice) {
      return {
        ...notice,
        severity: "notice",
        explanation:
          "Bei Weitergabe muessen die im Lizenztext geforderten NOTICE- und Lizenzhinweise mitgeliefert werden.",
        recommendation:
          "Fuehre NOTICE-Dateien und Lizenztexte in deinem Distributionspaket mit und automatisiere den Check im Release.",
      };
    }

    const copyleft = findRestriction(licenses, isCopyleftClause);
    if (copyleft) {
      return {
        ...copyleft,
        severity: "notice",
        explanation:
          "Redistribution aktiviert Copyleft-Pflichten fuer abgeleitete oder kombinierte Werke.",
        recommendation:
          "Lizenz des verteilten Gesamtwerks an die Copyleft-Pflicht anpassen oder die Komponente technisch trennen.",
      };
    }

    const attribution = findRestriction(licenses, isAttributionClause);
    if (attribution) {
      return {
        ...attribution,
        severity: "notice",
        explanation:
          "Bei Weitergabe muessen Copyright- und Lizenzhinweise erhalten bleiben.",
        recommendation:
          "Uebernimm Copyright-Notices und Lizenztexte vollstaendig in dein Paket oder deine Dokumentation.",
      };
    }
  }

  if (useCase === "internal-commercial") {
    const commercialLimit = findRestriction(licenses, isCommercialLimitClause);
    if (commercialLimit) {
      return {
        ...commercialLimit,
        severity:
          commercialLimit.license.rights.commercial_use === "no"
            ? "conflict"
            : "notice",
        explanation:
          commercialLimit.license.rights.commercial_use === "no"
            ? "Interne Unternehmensnutzung ist kommerziell; diese Lizenz erlaubt das nicht."
            : "Interne Unternehmensnutzung ist kommerziell; diese Lizenz erlaubt das nur unter Bedingungen.",
        recommendation:
          commercialLimit.license.rights.commercial_use === "no"
            ? "Nutze diese Lizenz nicht fuer interne kommerzielle Systeme oder beschaffe eine kommerzielle Separatlizenz."
            : "Dokumentiere die kommerziellen Bedingungen und pruefe vor Produktiveinsatz die Schwellenwerte.",
      };
    }
  }

  if (useCase === "research-only") {
    const researchOnly = findRestriction(licenses, (license, restriction) => {
      const haystack = restrictionText(restriction);
      return license.category === "research-only" || haystack.includes("research");
    });
    if (researchOnly) {
      return {
        ...researchOnly,
        severity: "notice",
        explanation:
          "Research-only-Lizenzen passen nur, solange der Einsatz nicht in kommerzielle oder produktive Nutzung kippt.",
        recommendation:
          "Halte Forschungszweck, Nutzerkreis und Nicht-Kommerzialisierung schriftlich fest; vor Produktisierung neu pruefen.",
      };
    }
  }

  return null;
}

function fallbackClauseForStatus(
  modelLicense: License,
  dependencyLicense: License,
  status: Compatibility,
): ClauseMatch | null {
  const licenses = [modelLicense, dependencyLicense];

  const preferred =
    status === "incompatible"
      ? findRestriction(licenses, (license, restriction) => {
          const haystack = restrictionText(restriction);
          return (
            haystack.includes("patent") ||
            isCopyleftClause(license, restriction) ||
            isCommercialLimitClause(license, restriction)
          );
        })
      : findRestriction(licenses, (license, restriction) => {
          return (
            isNoticeClause(license, restriction) ||
            isAttributionClause(license, restriction) ||
            isCopyleftClause(license, restriction) ||
            isCommercialLimitClause(license, restriction)
          );
        });

  const fallback =
    preferred ??
    findRestriction(licenses, (_license, restriction) => Boolean(restriction.quote));

  if (!fallback) return null;

  return {
    ...fallback,
    severity: status === "incompatible" ? "conflict" : "notice",
    explanation:
      status === "incompatible"
        ? "Die kuratierte Matrix bewertet diese Kombination fuer den gewaehlten Use-Case als inkompatibel."
        : "Die kuratierte Matrix bewertet diese Kombination als kompatibel, aber nur unter der genannten Bedingung.",
    recommendation:
      status === "incompatible"
        ? "Ersetze eine der beiden Lizenzen oder waehle eine explizit kompatible Alternative."
        : "Setze die genannte Bedingung vor Nutzung oder Distribution als festen Compliance-Schritt um.",
  };
}

function strongerSeverity(
  a: FindingSeverity,
  b: FindingSeverity,
): FindingSeverity {
  return a === "conflict" || b === "conflict" ? "conflict" : "notice";
}

function statusSeverity(status: Compatibility): FindingSeverity | null {
  if (status === "incompatible") return "conflict";
  if (status === "conditional") return "notice";
  return null;
}

function scenarioStatus(
  pair: CompatibilityPair | null,
  useCase: UseCaseId,
  sameLicense: boolean,
): Compatibility | "self" | null {
  if (sameLicense) return "self";
  return pair?.scenarios[useCase] ?? null;
}

function pairFinding(
  modelGroup: ResolvedModelGroup,
  dependencyLicense: License,
  useCase: UseCaseId,
  pair: CompatibilityPair | null,
): Finding | null {
  const sameLicense = modelGroup.license.id === dependencyLicense.id;
  const status = scenarioStatus(pair, useCase, sameLicense);
  if (!status) return null;

  const activeClause = activeUseCaseClause(
    modelGroup.license,
    dependencyLicense,
    useCase,
    sameLicense,
  );
  const baseSeverity =
    status === "self" ? null : statusSeverity(status as Compatibility);

  if (!baseSeverity && !activeClause) return null;

  const fallback =
    status === "self"
      ? null
      : fallbackClauseForStatus(
          modelGroup.license,
          dependencyLicense,
          status as Compatibility,
        );
  const clause = activeClause ?? fallback;
  if (!hasQuote(clause)) return null;

  const severity = activeClause
    ? baseSeverity
      ? strongerSeverity(activeClause.severity, baseSeverity)
      : activeClause.severity
    : baseSeverity ?? clause.severity;

  return {
    kind: "pair",
    id: [
      "pair",
      useCase,
      modelGroup.license.id,
      dependencyLicense.id,
      clause.restriction.id,
    ].join(":"),
    severity,
    use_case: useCase,
    model_license_id: modelGroup.license.id,
    model_license_name: modelGroup.license.name,
    model_names: modelGroup.modelNames,
    dependency_license_id: dependencyLicense.id,
    dependency_license_name: dependencyLicense.name,
    matrix_status: status,
    matrix_reviewed: status === "self" ? true : pair?.reviewed_by_user ?? false,
    clause: evidence(clause.license, clause.restriction),
    explanation: clause.explanation,
    recommendation:
      severity === "conflict" && clause.severity !== "conflict"
        ? "Behandle diese Kombination als Blocker, bis die Lizenzlage manuell freigegeben wurde."
        : clause.recommendation,
  };
}

function trainingImpact(useCase: UseCaseId): string {
  if (useCase === "research-only") {
    return "schwaecht ab: Research-only reduziert kommerzielle und Distributions-Trigger, die Datenherkunft bleibt aber zu dokumentieren.";
  }
  if (useCase === "internal-commercial") {
    return "verschaerft: kommerzielle Nutzung aktiviert TDM-, Rechteketten- und Datenschutzpruefungen; fehlende externe Bereitstellung mildert Netzwerkeffekte.";
  }
  if (useCase === "saas-external") {
    return "verschaerft: externe Nutzer erhoehen Output-, Datenschutz- und Reproduktionsrisiken.";
  }
  return "verschaerft: Weitergabe erhoeht Attribution-, NOTICE- und Rechtekettenrisiken.";
}

function trainingFinding(
  risk: TrainingDataRisk,
  useCase: UseCaseId,
): Finding {
  const legalBasis = Array.from(
    new Set(risk.legal_issues.map((issue) => issue.relevant_law)),
  ).join("; ");
  const firstIssue = risk.legal_issues[0];

  return {
    kind: "training-data",
    id: `training:${useCase}:${risk.id}`,
    severity: "notice",
    use_case: useCase,
    risk_id: risk.id,
    risk_name: risk.name,
    legal_basis: legalBasis,
    risk: firstIssue
      ? `${firstIssue.issue}: ${firstIssue.description}`
      : "Kein konkreter Rechtsgrund im Katalog hinterlegt.",
    use_case_impact: trainingImpact(useCase),
    recommendation:
      risk.mitigation_hints[0] ?? "Datenquelle und Rechtekette vor Einsatz dokumentieren.",
  };
}

function stringFlag(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function entityListFlag(value: unknown): string | null {
  if (Array.isArray(value)) {
    const entries = value.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim() !== "",
    );
    return entries.length > 0 ? entries.join(", ") : null;
  }
  return stringFlag(value);
}

function complianceFinding(
  model: ModelLike,
  lookup: Registry,
): Finding | null {
  if (isLicense(model)) return null;

  const license = lookup.getLicense(model.license_id);
  if (!license) return null;

  const modelFlags = model.compliance_flags;
  const licenseFlags = license.additional_compliance_flags;
  const entityListStatus = entityListFlag(
    modelFlags?.entity_list_status ?? licenseFlags?.entity_list_status,
  );
  const hardwareOrigin = stringFlag(
    modelFlags?.training_hardware_origin ??
      licenseFlags?.training_hardware_origin,
  );
  const publisherJurisdiction = stringFlag(
    modelFlags?.publisher_jurisdiction ?? licenseFlags?.publisher_jurisdiction,
  );

  const flags = [
    entityListStatus
      ? { label: "Entity-List-Status", value: entityListStatus }
      : null,
    hardwareOrigin ? { label: "Hardware-Origin", value: hardwareOrigin } : null,
    publisherJurisdiction
      ? { label: "Publisher-Jurisdiction", value: publisherJurisdiction }
      : null,
  ].filter((flag): flag is { label: string; value: string } => Boolean(flag));

  if (flags.length === 0) return null;

  return {
    kind: "compliance",
    id: `compliance:${model.id}`,
    severity: "notice",
    model_id: model.id,
    model_name: model.name,
    license_id: license.id,
    license_name: license.name,
    license_snapshot_date: license.official_source.snapshot_date,
    flags,
  };
}

function sortFindings(a: Finding, b: Finding): number {
  const severityRank = (finding: Finding) =>
    finding.severity === "conflict" ? 0 : 1;
  const kindRank = (finding: Finding) => {
    if (finding.kind === "pair") return 0;
    if (finding.kind === "training-data") return 1;
    return 2;
  };

  const bySeverity = severityRank(a) - severityRank(b);
  if (bySeverity !== 0) return bySeverity;
  const byKind = kindRank(a) - kindRank(b);
  if (byKind !== 0) return byKind;
  return a.id.localeCompare(b.id);
}

export function evaluateCompatibility(
  models: readonly ModelLike[],
  deps: readonly License[],
  risks: readonly TrainingDataRisk[],
  useCase: UseCaseLike,
  lookup: Registry = defaultRegistry,
): Finding[] {
  const useCaseId = normalizeUseCaseId(useCase);
  const modelGroups = resolveModelGroups(models, lookup);
  const dependencyLicenses = uniqueById(deps);
  const findings: Finding[] = [];

  for (const modelGroup of modelGroups) {
    for (const dependencyLicense of dependencyLicenses) {
      const pair =
        modelGroup.license.id === dependencyLicense.id
          ? null
          : lookup.findPair(modelGroup.license.id, dependencyLicense.id);
      const finding = pairFinding(
        modelGroup,
        dependencyLicense,
        useCaseId,
        pair,
      );
      if (finding) findings.push(finding);
    }
  }

  for (const risk of uniqueById(risks)) {
    findings.push(trainingFinding(risk, useCaseId));
  }

  for (const model of models) {
    const finding = complianceFinding(model, lookup);
    if (finding) findings.push(finding);
  }

  const deduped = new Map<string, Finding>();
  for (const finding of findings) {
    deduped.set(finding.id, finding);
  }

  return Array.from(deduped.values()).sort(sortFindings);
}
