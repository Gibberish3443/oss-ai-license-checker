export type LicenseCategory =
  | "osi-permissive"
  | "osi-weak-copyleft"
  | "osi-strong-copyleft"
  | "public-domain"
  | "source-available-restricted"
  | "research-only"
  | "proprietary-api-only"
  | "multi-tier-licensing";

export type YesNoConditional = "yes" | "no" | "conditional";
export type PatentGrant = "explicit" | "implicit" | "no_explicit" | "none";
export type Copyleft = "none" | "weak" | "strong" | "network";

export interface LicenseRights {
  commercial_use: YesNoConditional;
  modification: YesNoConditional;
  distribution: YesNoConditional;
  private_use: "yes" | "no";
  patent_grant: PatentGrant;
  attribution_required: boolean;
  copyleft: Copyleft;
}

export interface LicenseRestriction {
  id: string;
  clause_ref: string;
  quote: string | null;
  effect: string;
}

export interface OfficialSource {
  url: string;
  snapshot_date: string;
  local_snapshot: string;
  publisher: string;
}

export type EntityListEntry =
  | "US_Entity_List"
  | "US_SDN"
  | "US_MEU"
  | "US_UVL"
  | "US_1260H"
  | "UK_OFSI"
  | "EU_Sanctions"
  | "CN_UEL";

export type EntityListStatus = "none" | "unknown" | EntityListEntry[];

export type HardwareOrigin =
  | "unknown"
  | "nvidia"
  | "huawei-ascend"
  | "google-tpu"
  | "amd"
  | "mixed";

export interface AdditionalComplianceFlags {
  entity_list_status: EntityListStatus;
  training_hardware_origin: HardwareOrigin;
  publisher_jurisdiction: string;
}

export interface License {
  id: string;
  name: string;
  category: LicenseCategory;
  spdx_identifier: string | null;
  version: string;
  official_source: OfficialSource;
  rights: LicenseRights;
  restrictions: LicenseRestriction[];
  notes: string;
  additional_compliance_flags?: AdditionalComplianceFlags;
  has_usage_threshold?: boolean;
  legacy?: boolean;
}

export interface LegalIssue {
  issue: string;
  description: string;
  relevant_law: string;
  leading_case: string | null;
  quote: string | null;
  clause_ref: string | null;
}

export interface TrainingDataRisk {
  id: string;
  name: string;
  risk_level: "low" | "medium" | "high";
  legal_issues: LegalIssue[];
  mitigation_hints: string[];
}

export type UseCaseId =
  | "research-only"
  | "internal-commercial"
  | "saas-external"
  | "redistribution";

export interface UseCase {
  id: UseCaseId;
  name: string;
  description: string;
  license_sensitivity: {
    commercial_use_required: boolean;
    distribution_required: boolean;
    network_use: boolean;
    derivative_works: boolean;
  };
}

export interface Model {
  id: string;
  name: string;
  vendor: string;
  license_id: string;
  notes: string;
  compliance_flags?: AdditionalComplianceFlags;
}

export const CURATED_STATUSES = [
  "compatible",
  "conditional",
  "incompatible",
] as const;

export type CuratedStatus = (typeof CURATED_STATUSES)[number];
export type Compatibility = CuratedStatus;

export function isCuratedStatus(x: unknown): x is CuratedStatus {
  return (
    typeof x === "string" &&
    (CURATED_STATUSES as readonly string[]).includes(x)
  );
}

export interface CompatibilityPair {
  license_a: string;
  license_b: string;
  compatibility: Compatibility;
  reasoning: string;
  caveats: string[];
  scenarios: Record<UseCaseId, Compatibility>;
  reviewed_by_user?: boolean;
  reviewed_on?: string;
  review_ref?: string;
}

export interface CompatibilityMatrix {
  pairs: CompatibilityPair[];
}

export interface CheckInput {
  models: string[];
  codeDependencies: string[];
  trainingData: string[];
  useCase: UseCaseId;
}

export type CellStatus = Compatibility | "missing" | "self";

export interface CompatibilityCell {
  row: string;
  col: string;
  status: CellStatus;
  reasoning: string;
  caveats: string[];
  reviewed_by_user?: boolean;
}

export interface MatrixRow {
  model_id: string;
  license_id: string;
}

export interface MatrixColumn {
  license_id: string;
  dep_count: number;
}

export interface Conflict {
  license_a: string;
  license_b: string;
  reasoning: string;
  severity: "high" | "medium";
}

export interface MissingPair {
  license_a: string;
  license_b: string;
  context: string;
}

export interface UseCaseViolation {
  license_id: string;
  violation: string;
  severity: "high" | "medium" | "low";
}

export interface TrainingDataFlag {
  risk_id: string;
  risk_level: "low" | "medium" | "high";
  reason: string;
}

export type FindingSeverity = "conflict" | "notice";

export interface ClauseEvidence {
  license_id: string;
  license_name: string;
  restriction_id: string;
  clause_ref: string;
  quote: string;
  source_path: string;
  source_label: string;
}

export interface PairFinding {
  kind: "pair";
  id: string;
  severity: FindingSeverity;
  use_case: UseCaseId;
  model_license_id: string;
  model_license_name: string;
  model_names: string[];
  dependency_license_id: string;
  dependency_license_name: string;
  matrix_status: Compatibility | "self";
  matrix_reviewed: boolean;
  clause: ClauseEvidence;
  explanation: string;
  recommendation: string;
}

export interface TrainingRiskFinding {
  kind: "training-data";
  id: string;
  severity: FindingSeverity;
  use_case: UseCaseId;
  risk_id: string;
  risk_name: string;
  legal_basis: string;
  risk: string;
  use_case_impact: string;
  recommendation: string;
}

export interface ComplianceFlag {
  label: string;
  value: string;
}

export interface ComplianceFlagFinding {
  kind: "compliance";
  id: string;
  severity: "notice";
  model_id: string;
  model_name: string;
  license_id: string;
  license_name: string;
  license_snapshot_date: string;
  flags: ComplianceFlag[];
}

export type Finding = PairFinding | TrainingRiskFinding | ComplianceFlagFinding;

export interface Source {
  license_id: string;
  snapshot_path: string;
  clause_refs: string[];
}

export type OverallRisk = "green" | "yellow" | "red" | "missing";

export interface CheckResult {
  overallRisk: OverallRisk;
  complete: boolean;
  rows: MatrixRow[];
  cols: MatrixColumn[];
  matrix: CompatibilityCell[][];
  missingPairs: MissingPair[];
  modelCodeConflicts: Conflict[];
  useCaseViolations: UseCaseViolation[];
  trainingDataFlags: TrainingDataFlag[];
  findings: Finding[];
  recommendations: string[];
  sources: Source[];
}
