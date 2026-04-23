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

const RISK_COLORS: Record<OverallRisk, string> = {
  green:
    "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100",
  yellow:
    "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
  red: "border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100",
  missing:
    "border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100",
};

const SEVERITY_BADGE: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  low: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
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
  return (
    <div className="space-y-6">
      <div
        role="status"
        aria-live="polite"
        className={`rounded-lg border-l-4 p-5 ${RISK_COLORS[result.overallRisk]}`}
      >
        <h2 className="text-xl font-semibold">{RISK_HEADLINE[result.overallRisk]}</h2>
        <p className="mt-2 text-sm">{RISK_DESCRIPTION[result.overallRisk]}</p>
        <p className="mt-3 text-xs opacity-80">
          Use-Case: <span className="font-medium">{useCase.name}</span>
          {" · "}
          Modelle: {result.rows.length}
          {" · "}
          Code-Lizenzen: {result.cols.length}
          {" · "}
          Matrix: {result.complete ? "vollständig" : "unvollständig"}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-base font-semibold">Kompatibilitätsmatrix</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Zeilen = Modelle, Spalten = deduplizierte Code-Lizenzen. Status bezieht sich auf
          den aktuellen Use-Case. Tooltip (Hover) zeigt das Reasoning der kuratierten Paar-Bewertung.
        </p>
        <div className="mt-4">
          <MatrixGrid
            result={result}
            modelById={modelById}
            licenseById={licenseById}
          />
        </div>
      </section>

      {result.missingPairs.length > 0 && (
        <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="text-base font-semibold">Fehlende Matrix-Paare</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Diese Paare sind in der kuratierten Matrix nicht bewertet und müssen vor Produktiveinsatz
            manuell geprüft werden.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {result.missingPairs.map((p, i) => (
              <li key={i} className="font-mono">
                {p.license_a} ↔ {p.license_b}
                <span className="ml-2 text-xs font-sans text-zinc-500 dark:text-zinc-400">
                  ({p.context})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.modelCodeConflicts.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold">Lizenz-Konflikte</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {result.modelCodeConflicts.map((c, i) => (
              <li key={i} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">
                    {c.license_a} ↔ {c.license_b}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[0.7rem] font-medium ${SEVERITY_BADGE[c.severity]}`}
                  >
                    {SEVERITY_LABEL[c.severity]}
                  </span>
                </div>
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">{c.reasoning}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.useCaseViolations.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold">Use-Case-Verstöße</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Scheitern einzelner Lizenzen am gewählten Use-Case, unabhängig von Inter-License-Konflikten.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {result.useCaseViolations.map((v, i) => {
              const license = licenseById.get(v.license_id);
              return (
                <li
                  key={i}
                  className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{license?.name ?? v.license_id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[0.7rem] font-medium ${SEVERITY_BADGE[v.severity]}`}
                    >
                      {SEVERITY_LABEL[v.severity]}
                    </span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">{v.violation}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.trainingDataFlags.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold">Trainingsdaten-Flags</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {result.trainingDataFlags.map((f, i) => {
              const risk = riskById.get(f.risk_id);
              return (
                <li
                  key={i}
                  className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{risk?.name ?? f.risk_id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[0.7rem] font-medium ${SEVERITY_BADGE[f.risk_level]}`}
                    >
                      {SEVERITY_LABEL[f.risk_level]}
                    </span>
                  </div>
                  <p className="mt-2 text-zinc-700 dark:text-zinc-300">{f.reason}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.recommendations.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold">Empfehlungen</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Aggregiert aus Matrix-Caveats, Use-Case-Violations und Trainingsdaten-Mitigationen.
            Sortiert nach Priorität.
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
            {result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </section>
      )}

      {result.sources.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold">Quellen</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Lokale Lizenz-Snapshots der beteiligten Lizenzen. Klauselreferenzen beziehen sich auf den
            jeweiligen Snapshot.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {result.sources.map((s, i) => {
              const license = licenseById.get(s.license_id);
              return (
                <li key={i} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-medium">{license?.name ?? s.license_id}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    licenses/{s.snapshot_path}
                  </div>
                  {s.clause_refs.length > 0 && (
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Klauseln: {s.clause_refs.join(", ")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
