"use client";

import { useMemo, useState } from "react";
import { EngineInputError, runCheck } from "@/lib/check-engine";
import { defaultRegistry } from "@/lib/registry";
import type { CheckResult, UseCaseId } from "@/lib/types";
import InputForm, { type FlowStep } from "./_components/input-form";
import ResultView from "./_components/result-view";

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

  const [flowStep, setFlowStep] = useState<FlowStep>("use-case");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [codeDepCounts, setCodeDepCounts] = useState<Record<string, number>>({});
  const [selectedTrainingRisks, setSelectedTrainingRisks] = useState<string[]>([]);
  const [useCase, setUseCase] = useState<UseCaseId | null>(null);

  const check = useMemo<{ result: CheckResult | null; error: string | null }>(() => {
    if (!useCase || selectedModels.length === 0) {
      return { result: null, error: null };
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
    setUseCase(null);
    setFlowStep("use-case");
  }

  const currentUseCase = useCase ? data.useCaseById.get(useCase) : null;

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5">
          <div className="flex flex-col gap-4 border-b border-stone-300 pb-5 dark:border-stone-700 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
                OSS / AI / License Compatibility
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
                OSS AI License Checker
              </h1>
            </div>
            <div className="max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-stone-500 dark:text-stone-400">
              <span className="block">Stand {today}</span>
              <span className="block">
                {data.licenses.length} Lizenzen · {data.models.length} Modelle ·{" "}
                {data.trainingRisks.length} Risiken
              </span>
            </div>
          </div>
        </header>

        <main>
          <InputForm
            flowStep={flowStep}
            onFlowStepChange={setFlowStep}
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

          {flowStep === "result" && (
            <div className="flow-panel mt-8">
              {check.error ? (
                <div
                  role="alert"
                  className="border-l-2 border-red-700 py-4 pl-5 dark:border-red-400"
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
                />
              ) : (
                <div className="border border-stone-300 p-6 dark:border-stone-700">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                    Noch nicht bereit
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    Wähle mindestens einen Use Case und ein Modell, bevor das Ergebnis
                    berechnet wird.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-14 border-t border-stone-300 pt-6 dark:border-stone-700">
          <div className="grid gap-5 font-mono text-[11px] leading-relaxed text-stone-600 sm:grid-cols-3 dark:text-stone-400">
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
                Modus
              </p>
              <p className="mt-2 normal-case tracking-normal">
                Geführter Browser-Check ohne Upload, Datenbank oder externe API.
              </p>
            </div>
            <div>
              <p className="uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
                Quelle
              </p>
              <p className="mt-2 normal-case tracking-normal">
                Matrix deckt bewertete Modell-↔Code-Paare ab. Fehlende Paare werden
                als ungeprüft ausgewiesen.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
