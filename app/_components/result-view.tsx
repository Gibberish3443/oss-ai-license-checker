"use client";

import type {
  CellStatus,
  CheckResult,
  ComplianceFlagFinding,
  FindingSeverity,
  License,
  Model,
  PairFinding,
  TrainingRiskFinding,
  UseCase,
} from "@/lib/types";
import MatrixGrid from "./matrix-grid";

interface Props {
  result: CheckResult;
  useCase: UseCase;
  modelById: Map<string, Model>;
  licenseById: Map<string, License>;
}

const VERDICT_LABEL: Record<CheckResult["overallRisk"], string> = {
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
  missing: "Ungeprüft",
};

const VERDICT_FRAME: Record<CheckResult["overallRisk"], string> = {
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-50",
  yellow:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50",
  red:
    "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/35 dark:text-red-50",
  missing:
    "border-stone-300 bg-stone-100 text-stone-950 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50",
};

const FINDING_LINE: Record<FindingSeverity, string> = {
  conflict: "border-red-700 dark:border-red-400",
  notice: "border-amber-700 dark:border-amber-400",
};

const FINDING_INK: Record<FindingSeverity, string> = {
  conflict: "text-red-800 dark:text-red-300",
  notice: "text-amber-800 dark:text-amber-300",
};

const FINDING_LABEL: Record<FindingSeverity, string> = {
  conflict: "Konflikt",
  notice: "Hinweis",
};

const STATUS_LEGEND: Array<{ status: CellStatus; label: string }> = [
  { status: "compatible", label: "Kompatibel" },
  { status: "conditional", label: "Auflagen" },
  { status: "incompatible", label: "Blocker" },
  { status: "missing", label: "Ungeprüft" },
  { status: "self", label: "Identisch" },
];

const STATUS_LEGEND_DOT: Record<CellStatus, string> = {
  compatible: "bg-emerald-600 dark:bg-emerald-400",
  conditional: "bg-amber-600 dark:bg-amber-400",
  incompatible: "bg-red-600 dark:bg-red-400",
  missing: "bg-stone-500 dark:bg-stone-400",
  self: "bg-sky-600 dark:bg-sky-400",
};

function countStatus(result: CheckResult, status: CellStatus): number {
  let count = 0;
  for (const row of result.matrix) {
    for (const cell of row) {
      if (cell.status === status) count++;
    }
  }
  return count;
}

export default function ResultView({
  result,
  useCase,
  modelById,
  licenseById,
}: Props) {
  const pairFindings = result.findings.filter(
    (finding): finding is PairFinding => finding.kind === "pair",
  );
  const trainingFindings = result.findings.filter(
    (finding): finding is TrainingRiskFinding =>
      finding.kind === "training-data",
  );
  const complianceFindings = result.findings.filter(
    (finding): finding is ComplianceFlagFinding =>
      finding.kind === "compliance",
  );
  const conflictFindings = pairFindings.filter(
    (finding) => finding.severity === "conflict",
  );
  const noticeFindings = pairFindings.filter(
    (finding) => finding.severity === "notice",
  );

  return (
    <section className="space-y-5">
      <header
        role="status"
        aria-live="polite"
        className={`rounded-md border p-4 ${VERDICT_FRAME[result.overallRisk]}`}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
              Verdikt
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">
              {VERDICT_LABEL[result.overallRisk]}
            </h2>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
              Use Case
            </p>
            <p className="mt-1 text-sm font-medium leading-snug">{useCase.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[380px]">
            <Metric label="Modelle" value={String(result.rows.length)} />
            <Metric label="Code-Deps" value={String(result.cols.length)} />
            <Metric label="Konflikte" value={String(conflictFindings.length)} />
            <Metric label="Hinweise" value={String(noticeFindings.length)} />
          </div>
        </div>
      </header>

      <section
        aria-labelledby="matrix-heading"
        className="rounded-md border border-stone-300 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-950/60"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
              Kompatibilitätsmatrix
            </p>
            <h3
              id="matrix-heading"
              className="mt-1 text-xl font-semibold leading-tight"
            >
              Modell × Code-Dependency
            </h3>
          </div>
          <StatusLegend result={result} />
        </div>
        <MatrixGrid
          result={result}
          modelById={modelById}
          licenseById={licenseById}
        />
      </section>

      {(conflictFindings.length > 0 ||
        noticeFindings.length > 0 ||
        trainingFindings.length > 0 ||
        complianceFindings.length > 0 ||
        result.recommendations.length > 0) && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            {conflictFindings.length > 0 && (
              <FindingGroup title="Konflikte" findings={conflictFindings} />
            )}
            {noticeFindings.length > 0 && (
              <FindingGroup title="Hinweise" findings={noticeFindings} />
            )}
          </div>

          <aside className="space-y-5">
            {trainingFindings.length > 0 && (
              <TrainingPanel findings={trainingFindings} />
            )}
            {complianceFindings.length > 0 && (
              <CompliancePanel findings={complianceFindings} />
            )}
            {result.recommendations.length > 0 && (
              <Recommendations recommendations={result.recommendations.slice(0, 5)} />
            )}
          </aside>
        </div>
      )}

      <p className="border-t border-stone-300 pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-stone-500 dark:border-stone-700 dark:text-stone-500">
        Kein Rechtsrat. Der Report zeigt nur kuratierte Katalogregeln und lokale
        Lizenz-Snapshots; keine KI-generierte Rechtseinschätzung.
      </p>
    </section>
  );
}

function StatusLegend({ result }: { result: CheckResult }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {STATUS_LEGEND.map(({ status, label }) => {
        const count = countStatus(result, status);
        if (count === 0) return null;
        return (
          <li
            key={status}
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600 dark:text-stone-400"
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${STATUS_LEGEND_DOT[status]}`}
            />
            <span>{label}</span>
            <span className="text-stone-500 dark:text-stone-500">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FindingGroup({
  title,
  findings,
}: {
  title: string;
  findings: PairFinding[];
}) {
  return (
    <section>
      <h3 className="text-xl font-semibold leading-tight">{title}</h3>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {findings.map((finding) => (
          <PairFindingItem key={finding.id} finding={finding} />
        ))}
      </ul>
    </section>
  );
}

function PairFindingItem({ finding }: { finding: PairFinding }) {
  return (
    <li
      className={`rounded-md border border-stone-300 border-l-2 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-950/50 ${FINDING_LINE[finding.severity]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            {finding.model_names.join(", ")}
          </p>
          <h4 className="mt-1 text-sm font-semibold leading-tight">
            {finding.model_license_name} x {finding.dependency_license_name}
          </h4>
        </div>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.18em] ${FINDING_INK[finding.severity]}`}
        >
          {FINDING_LABEL[finding.severity]}
        </span>
      </div>

      <div className="mt-3">
        <mark className="box-decoration-clone bg-yellow-200 px-1 py-0.5 text-xs leading-relaxed text-stone-950 dark:bg-yellow-300">
          {finding.clause.quote}
        </mark>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-500">
          {finding.clause.source_label}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
        {finding.explanation}
      </p>
      <p className="mt-2 border-t border-stone-200 pt-2 text-xs leading-relaxed text-stone-900 dark:border-stone-800 dark:text-stone-100">
        {finding.recommendation}
      </p>
    </li>
  );
}

function TrainingPanel({ findings }: { findings: TrainingRiskFinding[] }) {
  return (
    <section>
      <h3 className="text-xl font-semibold leading-tight">Trainingsdaten</h3>
      <ul className="mt-3 space-y-3">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className={`rounded-md border border-stone-300 border-l-2 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-950/50 ${FINDING_LINE[finding.severity]}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold leading-tight">
                {finding.risk_name}
              </h4>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.16em] ${FINDING_INK[finding.severity]}`}
              >
                {FINDING_LABEL[finding.severity]}
              </span>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-stone-500 dark:text-stone-500">
              {finding.legal_basis}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
              {finding.risk}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-900 dark:text-stone-100">
              {finding.use_case_impact}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompliancePanel({ findings }: { findings: ComplianceFlagFinding[] }) {
  return (
    <section>
      <h3 className="text-xl font-semibold leading-tight">Compliance</h3>
      <ul className="mt-3 space-y-3">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="rounded-md border border-stone-300 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-950/50"
          >
            <h4 className="text-sm font-semibold leading-tight">
              {finding.model_name}
            </h4>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              {finding.license_name}
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {finding.flags.map((flag) => (
                <div key={`${finding.id}:${flag.label}`}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-500">
                    {flag.label}
                  </dt>
                  <dd className="mt-0.5 text-xs text-stone-900 dark:text-stone-100">
                    {flag.value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Recommendations({ recommendations }: { recommendations: string[] }) {
  return (
    <section className="rounded-md border border-stone-300 bg-stone-100/70 p-3 dark:border-stone-800 dark:bg-stone-900/60">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
        Nächste Schritte
      </h3>
      <ol className="mt-2 space-y-2">
        {recommendations.map((recommendation, index) => (
          <li key={recommendation} className="flex gap-2 text-xs leading-relaxed">
            <span className="font-mono text-[10px] text-stone-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{recommendation}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-current/20 p-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-65">
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-medium">{value}</div>
    </div>
  );
}
