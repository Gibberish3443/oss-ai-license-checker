"use client";

import { useMemo, useState } from "react";
import { runCheck } from "@/lib/check-engine";
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
      return {
        result: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [selectedModels, codeDepCounts, selectedTrainingRisks, useCase]);

  function reset() {
    setSelectedModels([]);
    setCodeDepCounts({});
    setSelectedTrainingRisks([]);
    setUseCase(DEFAULT_USE_CASE);
  }

  const currentUseCase = data.useCaseById.get(useCase);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <h1 className="text-3xl font-semibold tracking-tight">
            OSS AI License Checker
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Prüft die Lizenzlage einer Open-Weight-KI-Komposition entlang dreier Achsen:
            Modelllizenz, Lizenzen der Code-Abhängigkeiten und Risiken aus den Trainingsdaten.
            Die Bewertung läuft komplett deterministisch im Browser gegen einen kuratierten
            Lizenz- und Matrix-Katalog.
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Stand Katalog: {data.licenses.length} aktive Lizenzen, {data.models.length} Modelle,
            {" "}{data.trainingRisks.length} Trainingsdaten-Risiken. Kein Rechtsrat — Orientierung
            für die eigene Due Diligence.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
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
          </div>

          <div>
            {check.error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-5 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
              >
                <h2 className="text-base font-semibold">Prüfung nicht möglich</h2>
                <p className="mt-2 text-sm">{check.error}</p>
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
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Noch keine Prüfung
                </p>
                <p className="mt-2">
                  Use-Case wählen, mindestens ein Modell markieren und optional Code-Deps
                  und Trainingsdaten-Risiken ergänzen. Das Ergebnis erscheint hier, sobald
                  eine Auswahl steht.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <p>
            Katalog und Prüflogik unter MIT-Lizenz. Quellcode und Lizenz-Snapshots im
            Repo. Stand der Paare: {data.licenses.length} aktive Lizenzen in der
            Registry, Matrix deckt kuratierte Modell- ↔ Code-Paare ab.
          </p>
        </footer>
      </div>
    </div>
  );
}
