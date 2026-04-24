"use client";

import type {
  CheckResult,
  License,
  Model,
  OverallRisk,
  TrainingDataRisk,
  UseCase,
} from "@/lib/types";
import MatrixGrid from "./matrix-grid";

interface Props {
  result: CheckResult;
  useCase: UseCase;
  modelById: Map<string, Model>;
  licenseById: Map<string, License>;
  riskById: Map<string, TrainingDataRisk>;
}

const RISK_HEADLINE: Record<OverallRisk, string> = {
  green: "Grün — tragfähig",
  yellow: "Gelb — mit Auflagen tragfähig",
  red: "Rot — nicht tragfähig",
  missing: "Ungeprüft — Matrix unvollständig",
};

const RISK_DESCRIPTION: Record<OverallRisk, string> = {
  green:
    "Alle geprüften Lizenzpaare sind im gewählten Use-Case kompatibel. Keine Auflagen, keine Trainingsdaten-Flags mit relevantem Risikolevel.",
  yellow:
    "Einsatz grundsätzlich möglich, aber es gibt Bedingungen (z. B. NOTICE-Pflicht, Network-Copyleft, mittelschwerer Trainingsdaten-Hinweis). Auflagen vor Produktiveinsatz umsetzen.",
  red:
    "Mindestens ein Paar ist im gewählten Use-Case inkompatibel oder eine Lizenz scheitert hart am Use-Case. Kombination so nicht tragfähig.",
  missing:
    "Mindestens ein Lizenzpaar fehlt in der kuratierten Matrix. Ergebnis ist ungeprüft — Paare müssen manuell bewertet werden, bevor eine Ampel vergeben werden kann.",
};

const RISK_HERO_BG: Record<OverallRisk, string> = {
  green: "bg-emerald-50 dark:bg-emerald-950/30",
  yellow: "bg-amber-50 dark:bg-amber-950/30",
  red: "bg-red-50 dark:bg-red-950/30",
  missing: "bg-stone-100 dark:bg-stone-900/60",
};

const RISK_INK: Record<OverallRisk, string> = {
  green: "text-emerald-900 dark:text-emerald-100",
  yellow: "text-amber-900 dark:text-amber-100",
  red: "text-red-900 dark:text-red-100",
  missing: "text-stone-900 dark:text-stone-100",
};

const RISK_RUBRIC_INK: Record<OverallRisk, string> = {
  green: "text-emerald-800 dark:text-emerald-300",
  yellow: "text-amber-800 dark:text-amber-300",
  red: "text-red-800 dark:text-red-300",
  missing: "text-stone-700 dark:text-stone-300",
};

const SEVERITY_LINE: Record<"high" | "medium" | "low", string> = {
  high: "border-red-700 dark:border-red-400",
  medium: "border-amber-700 dark:border-amber-400",
  low: "border-emerald-700 dark:border-emerald-400",
};

const SEVERITY_INK: Record<"high" | "medium" | "low", string> = {
  high: "text-red-800 dark:text-red-300",
  medium: "text-amber-800 dark:text-amber-300",
  low: "text-emerald-800 dark:text-emerald-300",
};

const SEVERITY_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "hoch",
  medium: "mittel",
  low: "niedrig",
};

export default function ResultView({
  result,
  useCase,
  modelById,
  licenseById,
  riskById,
}: Props) {
  const risk = result.overallRisk;
  const unreviewedMatrixCells = result.matrix
    .flat()
    .filter((cell) => cell.reviewed_by_user === false).length;

  return (
    <div>
      <div
        role="status"
        aria-live="polite"
        className={`border-b border-stone-300 dark:border-stone-700 ${RISK_HERO_BG[risk]} -mx-4 px-4 py-10 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10`}
      >
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.22em] ${RISK_RUBRIC_INK[risk]}`}
        >
          Verdikt
        </p>
        <h2
          className={`mt-3 font-serif text-[48px] leading-[1.02] tracking-tight ${RISK_INK[risk]}`}
        >
          {RISK_HEADLINE[risk]}
        </h2>
        <p
          className={`mt-5 max-w-[60ch] text-[17px] leading-[1.55] ${RISK_INK[risk]}`}
        >
          {RISK_DESCRIPTION[risk]}
        </p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-600 dark:text-stone-400">
          Use-Case: {useCase.name} · Modelle: {result.rows.length} · Code-Lizenzen:{" "}
          {result.cols.length} · Matrix: {result.complete ? "vollständig" : "unvollständig"}
        </p>
        {unreviewedMatrixCells > 0 && (
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {unreviewedMatrixCells} Matrixzellen basieren auf generischer
            Einordnung und sind noch nicht als manuell reviewed markiert.
          </p>
        )}
      </div>

      <ReportSection rubric="Matrix" title="Kompatibilitätsmatrix">
        <p className="mb-6 text-sm text-stone-600 dark:text-stone-400">
          Zeilen = Modelle, Spalten = deduplizierte Code-Lizenzen. Status bezieht sich
          auf den aktuellen Use-Case. Begründung und Auflagen stehen jeweils direkt in
          der Zelle.
        </p>
        <MatrixGrid
          result={result}
          modelById={modelById}
          licenseById={licenseById}
        />
      </ReportSection>

      {result.missingPairs.length > 0 && (
        <ReportSection
          rubric="Fehlende Paare"
          title="Fehlende Matrix-Paare"
        >
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
            Diese Paare sind in der kuratierten Matrix nicht bewertet und müssen vor
            Produktiveinsatz manuell geprüft werden.
          </p>
          <ul className="space-y-2">
            {result.missingPairs.map((p) => (
              <li
                key={`${p.license_a}|${p.license_b}|${p.context}`}
                className="border-l-2 border-stone-400 pl-4 py-1 font-mono text-sm dark:border-stone-600"
              >
                {p.license_a} ↔ {p.license_b}
                <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
                  ({p.context})
                </span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {result.modelCodeConflicts.length > 0 && (
        <ReportSection rubric="Konflikte" title="Lizenz-Konflikte">
          <ul className="space-y-4">
            {result.modelCodeConflicts.map((c, i) => (
              <li
                key={`${c.license_a}|${c.license_b}|${c.severity}|${i}`}
                className={`border-l-2 pl-4 py-2 ${SEVERITY_LINE[c.severity]}`}
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[13px]">
                    {c.license_a} ↔ {c.license_b}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] ${SEVERITY_INK[c.severity]}`}
                  >
                    {SEVERITY_LABEL[c.severity]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {c.reasoning}
                </p>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {result.useCaseViolations.length > 0 && (
        <ReportSection rubric="Use-Case" title="Use-Case-Verstöße">
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
            Scheitern einzelner Lizenzen am gewählten Use-Case, unabhängig von
            Inter-License-Konflikten.
          </p>
          <ul className="space-y-4">
            {result.useCaseViolations.map((v) => {
              const license = licenseById.get(v.license_id);
              return (
                <li
                  key={`${v.license_id}|${v.severity}|${v.violation}`}
                  className={`border-l-2 pl-4 py-2 ${SEVERITY_LINE[v.severity]}`}
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-serif text-[17px] italic">
                      {license?.name ?? v.license_id}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.18em] ${SEVERITY_INK[v.severity]}`}
                    >
                      {SEVERITY_LABEL[v.severity]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {v.violation}
                  </p>
                </li>
              );
            })}
          </ul>
        </ReportSection>
      )}

      {result.trainingDataFlags.length > 0 && (
        <ReportSection
          rubric="Trainingsdaten"
          title="Trainingsdaten-Flags"
        >
          <ul className="space-y-4">
            {result.trainingDataFlags.map((f) => {
              const risk = riskById.get(f.risk_id);
              return (
                <li
                  key={f.risk_id}
                  className={`border-l-2 pl-4 py-2 ${SEVERITY_LINE[f.risk_level]}`}
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-serif text-[17px] italic">
                      {risk?.name ?? f.risk_id}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.18em] ${SEVERITY_INK[f.risk_level]}`}
                    >
                      {SEVERITY_LABEL[f.risk_level]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {f.reason}
                  </p>
                </li>
              );
            })}
          </ul>
        </ReportSection>
      )}

      {result.recommendations.length > 0 && (
        <ReportSection rubric="Empfehlungen" title="Empfehlungen">
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
            Aggregiert aus Matrix-Caveats, Use-Case-Violations und
            Trainingsdaten-Mitigationen. Sortiert nach Priorität.
          </p>
          <ol className="space-y-3">
            {result.recommendations.map((r, i) => (
              <li key={r} className="flex gap-4 text-sm leading-relaxed">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-stone-800 dark:text-stone-200">{r}</span>
              </li>
            ))}
          </ol>
        </ReportSection>
      )}

      {result.sources.length > 0 && (
        <ReportSection rubric="Quellen" title="Quellen">
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
            Lokale Lizenz-Snapshots der beteiligten Lizenzen. Klauselreferenzen beziehen
            sich auf den jeweiligen Snapshot.
          </p>
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {result.sources.map((s) => {
              const license = licenseById.get(s.license_id);
              return (
                <li key={s.license_id} className="py-3">
                  <div className="font-serif text-[17px] italic">
                    {license?.name ?? s.license_id}
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-stone-600 dark:text-stone-400">
                    licenses/{s.snapshot_path}
                  </div>
                  {s.clause_refs.length > 0 && (
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-500">
                      Klauseln · {s.clause_refs.join(", ")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ReportSection>
      )}
    </div>
  );
}

function ReportSection({
  rubric,
  title,
  children,
}: {
  rubric: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-300 pt-10 mt-10 dark:border-stone-700">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
          {rubric}
        </p>
        <h3 className="mt-2 font-serif text-[32px] leading-[1.05] tracking-tight">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}
