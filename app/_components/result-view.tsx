"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import { buildVerdictSummary, type VerdictTone } from "@/lib/verdict-summary";
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

const VERDICT_ACCENT: Record<VerdictTone, string> = {
  green: "border-l-emerald-600 dark:border-l-emerald-400",
  yellow: "border-l-amber-600 dark:border-l-amber-400",
  red: "border-l-red-600 dark:border-l-red-400",
  missing: "border-l-stone-500 dark:border-l-stone-400",
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

type TabTone = "conflict" | "notice" | "default";

const TAB_ACTIVE: Record<TabTone, string> = {
  conflict:
    "border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100",
  notice:
    "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
  default:
    "border-stone-500 bg-stone-100 text-stone-900 dark:border-stone-400 dark:bg-stone-800 dark:text-stone-100",
};

const TAB_IDLE =
  "border-stone-300 bg-white/60 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950/50 dark:text-stone-300 dark:hover:bg-stone-900";

const TAB_BADGE_ACTIVE: Record<TabTone, string> = {
  conflict: "bg-red-200 text-red-900 dark:bg-red-900/70 dark:text-red-100",
  notice: "bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-100",
  default: "bg-stone-300 text-stone-900 dark:bg-stone-700 dark:text-stone-100",
};

const TAB_BADGE_IDLE =
  "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300";

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

type TabId = "conflict" | "notice" | "training" | "compliance" | "steps";

interface TabConfig {
  id: TabId;
  label: string;
  count: number;
  tone: TabTone;
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

  const verdict = useMemo(
    () => buildVerdictSummary(result, useCase),
    [result, useCase],
  );

  return (
    <section className="space-y-5">
      <aside
        role="note"
        aria-label="Rechtlicher Hinweis"
        className="rounded-md border border-stone-400 bg-stone-50 p-3 text-xs leading-relaxed text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          Rechtlicher Hinweis
        </p>
        <p className="mt-1">
          Keine Rechtsdienstleistung i.S.d. § 2 RDG. Kein Mandatsverhältnis. Die
          Ausgabe ist eine schematische Zuordnung dokumentierter Lizenzklauseln
          zu Katalog-Einordnungen und ersetzt keine anwaltliche Beratung im
          Einzelfall.
        </p>
      </aside>
      <header
        role="status"
        aria-live="polite"
        className={`rounded-md border p-4 ${VERDICT_FRAME[result.overallRisk]}`}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
              Katalog-Ergebnis
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

      <VerdictCard
        headline={verdict.headline}
        tone={verdict.tone}
        rationale={verdict.rationale}
        nextStep={verdict.nextStep}
      />

      <FindingsPanel
        conflictFindings={conflictFindings}
        noticeFindings={noticeFindings}
        trainingFindings={trainingFindings}
        complianceFindings={complianceFindings}
        recommendations={result.recommendations}
      />

      <p className="border-t border-stone-300 pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-stone-500 dark:border-stone-700 dark:text-stone-500">
        Der Report zeigt nur kuratierte Katalogregeln und lokale
        Lizenz-Snapshots; keine KI-generierte Rechtseinschätzung.
      </p>
    </section>
  );
}

function StatusLegend({ result }: { result: CheckResult }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {STATUS_LEGEND.map(({ status, label }) => {
        const count = countStatus(result, status);
        if (count === 0) return null;
        return (
          <li
            key={status}
            className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600 dark:text-stone-400"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${STATUS_LEGEND_DOT[status]}`}
              />
              <span>{label}</span>
            </span>
            <span className="rounded-sm bg-stone-200 px-1.5 py-0.5 text-[10px] leading-none text-stone-800 dark:bg-stone-800 dark:text-stone-200">
              {count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function VerdictCard({
  headline,
  tone,
  rationale,
  nextStep,
}: {
  headline: string;
  tone: VerdictTone;
  rationale: string[];
  nextStep: string | null;
}) {
  return (
    <section
      aria-label="Fazit"
      className={`rounded-md border border-stone-300 border-l-4 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-950/60 ${VERDICT_ACCENT[tone]}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
        Fazit (regelbasiert)
      </p>
      <h3 className="mt-1 text-lg font-semibold leading-snug">{headline}</h3>
      {rationale.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rationale.map((line, index) => (
            <li
              key={`${index}-${line.slice(0, 16)}`}
              className="flex gap-2 text-xs leading-relaxed text-stone-700 dark:text-stone-300"
            >
              <span
                aria-hidden="true"
                className="font-mono text-[10px] leading-relaxed text-stone-500"
              >
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {nextStep && (
        <p className="mt-3 border-t border-stone-200 pt-2 text-xs leading-relaxed text-stone-900 dark:border-stone-800 dark:text-stone-100">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            Nächster Schritt
          </span>
          <span className="ml-2">{nextStep}</span>
        </p>
      )}
    </section>
  );
}

function FindingsPanel({
  conflictFindings,
  noticeFindings,
  trainingFindings,
  complianceFindings,
  recommendations,
}: {
  conflictFindings: PairFinding[];
  noticeFindings: PairFinding[];
  trainingFindings: TrainingRiskFinding[];
  complianceFindings: ComplianceFlagFinding[];
  recommendations: string[];
}) {
  const tabs = useMemo<TabConfig[]>(() => {
    const all: TabConfig[] = [
      {
        id: "conflict",
        label: "Konflikte",
        count: conflictFindings.length,
        tone: "conflict",
      },
      {
        id: "notice",
        label: "Hinweise",
        count: noticeFindings.length,
        tone: "notice",
      },
      {
        id: "training",
        label: "Trainingsdaten",
        count: trainingFindings.length,
        tone: trainingFindings.some((f) => f.severity === "conflict")
          ? "conflict"
          : "notice",
      },
      {
        id: "compliance",
        label: "Compliance",
        count: complianceFindings.length,
        tone: "default",
      },
      {
        id: "steps",
        label: "Schritte",
        count: Math.min(recommendations.length, 5),
        tone: "default",
      },
    ];
    return all.filter((tab) => tab.count > 0);
  }, [
    conflictFindings,
    noticeFindings,
    trainingFindings,
    complianceFindings,
    recommendations,
  ]);

  const [activeId, setActiveId] = useState<TabId | null>(tabs[0]?.id ?? null);

  if (tabs.length === 0) return null;

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <section
      aria-label="Befunde"
      className="rounded-md border border-stone-300 bg-white/70 dark:border-stone-800 dark:bg-stone-950/60"
    >
      <div
        role="tablist"
        aria-label="Befund-Kategorien"
        className="flex flex-wrap gap-2 border-b border-stone-200 p-3 dark:border-stone-800"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive ? TAB_ACTIVE[tab.tone] : TAB_IDLE
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none ${
                  isActive ? TAB_BADGE_ACTIVE[tab.tone] : TAB_BADGE_IDLE
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="p-3">
        <TabContent
          activeId={active.id}
          conflictFindings={conflictFindings}
          noticeFindings={noticeFindings}
          trainingFindings={trainingFindings}
          complianceFindings={complianceFindings}
          recommendations={recommendations}
        />
      </div>
    </section>
  );
}

function TabContent({
  activeId,
  conflictFindings,
  noticeFindings,
  trainingFindings,
  complianceFindings,
  recommendations,
}: {
  activeId: TabId;
  conflictFindings: PairFinding[];
  noticeFindings: PairFinding[];
  trainingFindings: TrainingRiskFinding[];
  complianceFindings: ComplianceFlagFinding[];
  recommendations: string[];
}): ReactNode {
  if (activeId === "conflict") {
    return (
      <>
        <Hint text="Katalog-Einordnung (keine Vertragsauslegung)." />
        <FindingList findings={conflictFindings} />
      </>
    );
  }
  if (activeId === "notice") {
    return (
      <>
        <Hint text="Katalog-Einordnung (keine Vertragsauslegung)." />
        <FindingList findings={noticeFindings} />
      </>
    );
  }
  if (activeId === "training") {
    return <TrainingList findings={trainingFindings} />;
  }
  if (activeId === "compliance") {
    return <ComplianceList findings={complianceFindings} />;
  }
  return <RecommendationList items={recommendations.slice(0, 5)} />;
}

function Hint({ text }: { text: string }) {
  return (
    <p className="mb-3 text-[11px] italic leading-relaxed text-stone-500 dark:text-stone-400">
      {text}
    </p>
  );
}

function FindingList({ findings }: { findings: PairFinding[] }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {findings.map((finding) => (
        <PairFindingItem key={finding.id} finding={finding} />
      ))}
    </ul>
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
        <div className="flex flex-col items-end gap-1">
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.18em] ${FINDING_INK[finding.severity]}`}
          >
            {FINDING_LABEL[finding.severity]}
          </span>
          {finding.matrix_reviewed !== true && (
            <span
              title="Paar noch nicht manuell reviewt"
              className="font-mono text-[9px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400"
            >
              ungeprüft
            </span>
          )}
        </div>
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

function TrainingList({ findings }: { findings: TrainingRiskFinding[] }) {
  return (
    <ul className="space-y-3">
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
  );
}

function ComplianceList({ findings }: { findings: ComplianceFlagFinding[] }) {
  return (
    <ul className="space-y-3">
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
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-500">
            Stand Snapshot: {finding.license_snapshot_date}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
  );
}

function RecommendationList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-xs leading-relaxed">
          <span className="font-mono text-[10px] text-stone-500">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-stone-800 dark:text-stone-200">{item}</span>
        </li>
      ))}
    </ol>
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
