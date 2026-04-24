"use client";

import { useMemo, useState } from "react";
import { EngineInputError, runCheck } from "@/lib/check-engine";
import { defaultRegistry } from "@/lib/registry";
import type { CheckResult, UseCaseId } from "@/lib/types";
import InputForm from "./_components/input-form";
import ResultView from "./_components/result-view";

const DEFAULT_USE_CASE: UseCaseId = "internal-commercial";

export default function Home() {
  const data = useMemo(() => {
    const models = defaultRegistry.listModels();
    const licenses = defaultRegistry
      .listLicenses()
      .filter((l) => !l.legacy)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
    const trainingRisks = defaultRegistry.listTrainingRisks();
    const useCases = defaultRegistry.listUseCases();
    const modelById = new Map(models.map((m) => [m.id, m]));
    const licenseById = new Map(
      defaultRegistry.listLicenses().map((l) => [l.id, l]),
    );
    const riskById = new Map(trainingRisks.map((r) => [r.id, r]));
    const useCaseById = new Map(useCases.map((uc) => [uc.id, uc]));
    return {
      models,
      licenses,
      trainingRisks,
      useCases,
      modelById,
      licenseById,
      riskById,
      useCaseById,
    };
  }, []);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [codeDepCounts, setCodeDepCounts] = useState<Record<string, number>>({});
  const [selectedTrainingRisks, setSelectedTrainingRisks] = useState<string[]>([]);
  const [useCase, setUseCase] = useState<UseCaseId>(DEFAULT_USE_CASE);

  const check = useMemo<{ result: CheckResult | null; error: string | null }>(() => {
    if (selectedModels.length === 0 && Object.keys(codeDepCounts).length === 0) {
      return { result: null, error: null };
    }
    if (selectedModels.length === 0) {
      return {
        result: null,
        error: "Mindestens ein Modell auswählen, um die Prüfung zu starten.",
      };
    }
    const codeDependencies: string[] = [];
    for (const [licenseId, count] of Object.entries(codeDepCounts)) {
      for (let i = 0; i < count; i++) codeDependencies.push(licenseId);
    }
    try {
      const result = runCheck(
        {
          models: selectedModels,
          codeDependencies,
          trainingData: selectedTrainingRisks,
          useCase,
        },
        defaultRegistry,
      );
      return { result, error: null };
    } catch (e) {
      // Nur Eingabe-Fehler der Engine freundlich rendern. Alles andere ist ein
      // Bug und soll an die React Error Boundary durchschlagen, statt als
      // anonymer Roh-Stacktrace im UI zu landen.
      if (e instanceof EngineInputError) {
        return { result: null, error: e.message };
      }
      throw e;
    }
  }, [selectedModels, codeDepCounts, selectedTrainingRisks, useCase]);

  function reset() {
    setSelectedModels([]);
    setCodeDepCounts({});
    setSelectedTrainingRisks([]);
    setUseCase(DEFAULT_USE_CASE);
  }

  const currentUseCase = data.useCaseById.get(useCase);

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <header className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-serif text-[56px] leading-[0.95] tracking-tight sm:text-[72px]">
              OSS AI License Checker
            </h1>
            <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-stone-500 dark:text-stone-400">
              <span className="block">Stand {today}</span>
              <span className="block">
                {data.licenses.length} Lizenzen · {data.models.length} Modelle ·{" "}
                {data.trainingRisks.length} Risiken
              </span>
            </p>
          </div>
          <div
            aria-hidden="true"
            className="mt-8 border-t border-stone-900 dark:border-stone-100"
          />
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.6] text-stone-700 dark:text-stone-300">
            Prüft die Lizenzlage einer Open-Weight-KI-Komposition entlang dreier Achsen:
            Modelllizenz, Lizenzen der Code-Abhängigkeiten und Risiken aus den Trainingsdaten.
            Deterministisch im Browser, gegen einen kuratierten Katalog. Kein Rechtsrat —
            Orientierung für die eigene Due Diligence.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <InputForm
              models={data.models}
              licenses={data.licenses}
              trainingRisks={data.trainingRisks}
              useCases={data.useCases}
              licenseById={data.licenseById}
              selectedModels={selectedModels}
              onModelsChange={setSelectedModels}
              codeDepCounts={codeDepCounts}
              onCodeDepCountsChange={setCodeDepCounts}
              selectedTrainingRisks={selectedTrainingRisks}
              onTrainingRisksChange={setSelectedTrainingRisks}
              useCase={useCase}
              onUseCaseChange={setUseCase}
              onReset={reset}
            />
          </aside>

          <main>
            {check.error ? (
              <div
                role="alert"
                className="border-l-2 border-red-700 pl-5 py-4 dark:border-red-400"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
                  Prüfung nicht möglich
                </p>
                <h2 className="mt-2 font-serif text-[28px] leading-tight text-red-900 dark:text-red-100">
                  {check.error}
                </h2>
              </div>
            ) : check.result && currentUseCase ? (
              <ResultView
                result={check.result}
                useCase={currentUseCase}
                modelById={data.modelById}
                licenseById={data.licenseById}
                riskById={data.riskById}
              />
            ) : (
              <div className="flex min-h-[320px] flex-col items-start justify-center py-16">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                  Wartend
                </p>
                <p className="mt-3 font-serif text-[40px] leading-[1.05] tracking-tight text-stone-900 dark:text-stone-100">
                  Noch keine Prüfung.
                </p>
                <p className="mt-4 max-w-[44ch] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  Use-Case, mindestens ein Modell, optional Code-Deps und Trainingsdaten —
                  das Verdikt erscheint, sobald die Auswahl steht.
                </p>
              </div>
            )}
          </main>
        </div>

        <footer className="mt-16 border-t border-stone-300 pt-8 dark:border-stone-700">
          <div className="grid gap-6 font-mono text-[11px] leading-relaxed text-stone-600 sm:grid-cols-3 dark:text-stone-400">
            <div>
              <p className="uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                Katalog
              </p>
              <p className="mt-2 normal-case tracking-normal">
                {data.licenses.length} aktive Lizenzen · {data.models.length} Modelle ·{" "}
                {data.trainingRisks.length} Trainingsdaten-Risiken
              </p>
            </div>
            <div>
              <p className="uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                Lizenz
              </p>
              <p className="mt-2 normal-case tracking-normal">
                MIT — Katalog und Prüflogik. Lizenz-Snapshots im Repo.
              </p>
            </div>
            <div>
              <p className="uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                Quelle
              </p>
              <p className="mt-2 normal-case tracking-normal">
                Matrix deckt kuratierte Modell- ↔ Code-Paare ab. Fehlende Paare
                werden als „ungeprüft" ausgewiesen.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
