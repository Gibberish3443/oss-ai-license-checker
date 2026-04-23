"use client";

import type {
  License,
  Model,
  TrainingDataRisk,
  UseCase,
  UseCaseId,
} from "@/lib/types";

interface Props {
  models: Model[];
  licenses: License[];
  trainingRisks: TrainingDataRisk[];
  useCases: UseCase[];
  licenseById: Map<string, License>;
  selectedModels: string[];
  onModelsChange: (next: string[]) => void;
  codeDepCounts: Record<string, number>;
  onCodeDepCountsChange: (next: Record<string, number>) => void;
  selectedTrainingRisks: string[];
  onTrainingRisksChange: (next: string[]) => void;
  useCase: UseCaseId;
  onUseCaseChange: (next: UseCaseId) => void;
  onReset: () => void;
}

const RISK_LABEL: Record<TrainingDataRisk["risk_level"], string> = {
  low: "niedrig",
  medium: "mittel",
  high: "hoch",
};

const RISK_BADGE: Record<TrainingDataRisk["risk_level"], string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function InputForm({
  models,
  licenses,
  trainingRisks,
  useCases,
  licenseById,
  selectedModels,
  onModelsChange,
  codeDepCounts,
  onCodeDepCountsChange,
  selectedTrainingRisks,
  onTrainingRisksChange,
  useCase,
  onUseCaseChange,
  onReset,
}: Props) {
  function updateDepCount(licenseId: string, rawValue: string) {
    const next = { ...codeDepCounts };
    const parsed = Math.max(0, Math.min(999, Math.floor(Number(rawValue) || 0)));
    if (parsed <= 0) {
      delete next[licenseId];
    } else {
      next[licenseId] = parsed;
    }
    onCodeDepCountsChange(next);
  }

  function toggleDep(licenseId: string) {
    if (codeDepCounts[licenseId]) {
      const next = { ...codeDepCounts };
      delete next[licenseId];
      onCodeDepCountsChange(next);
    } else {
      onCodeDepCountsChange({ ...codeDepCounts, [licenseId]: 1 });
    }
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Eingabemaske"
    >
      <Section
        step={1}
        title="Use-Case"
        description="Wofür soll die Kombination eingesetzt werden? Steuert, welche Szenario-Spalte der Matrix ausgewertet wird."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Use-Case</legend>
          {useCases.map((uc) => (
            <label
              key={uc.id}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors ${
                useCase === uc.id
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="useCase"
                value={uc.id}
                checked={useCase === uc.id}
                onChange={() => onUseCaseChange(uc.id)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium">{uc.name}</span>
                <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">
                  {uc.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </Section>

      <Section
        step={2}
        title="Modelle"
        description="Welche Open-Weight-Modelle sollen geprüft werden? Jedes Modell zieht seine Modelllizenz in die Matrix."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Modelle</legend>
          {models.map((m) => {
            const license = licenseById.get(m.license_id);
            const checked = selectedModels.includes(m.id);
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors ${
                  checked
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onModelsChange(toggleInArray(selectedModels, m.id))}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="block font-medium">{m.name}</span>
                  <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                    {m.vendor}
                  </span>
                  <span className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 font-mono text-[0.7rem] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {license?.name ?? m.license_id}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      <Section
        step={3}
        title="Code-Abhängigkeiten"
        description="Lizenzen der im Projekt verwendeten Libraries. Mehrere Deps pro Lizenz? Anzahl rechts anpassen."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Code-Abhängigkeiten</legend>
          {licenses.map((l) => {
            const count = codeDepCounts[l.id] ?? 0;
            const active = count > 0;
            return (
              <div
                key={l.id}
                className={`flex items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  active
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDep(l.id)}
                  className="mt-1"
                  aria-label={`${l.name} als Abhängigkeit aufnehmen`}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block font-medium">{l.name}</span>
                      <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                        {l.category}
                      </span>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span aria-hidden="true">Anzahl</span>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={count}
                        onChange={(e) => updateDepCount(l.id, e.target.value)}
                        aria-label={`Anzahl Abhängigkeiten mit Lizenz ${l.name}`}
                        className="w-16 rounded border border-zinc-300 px-2 py-1 text-right font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </fieldset>
      </Section>

      <Section
        step={4}
        title="Trainingsdaten-Risiken"
        description="Bekannte Risiken aus den Trainingskorpora der eingesetzten Modelle. Optional, beeinflusst die Ampel ab Risiko „mittel“."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Trainingsdaten-Risiken</legend>
          {trainingRisks.map((r) => {
            const checked = selectedTrainingRisks.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors ${
                  checked
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onTrainingRisksChange(toggleInArray(selectedTrainingRisks, r.id))
                  }
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[0.7rem] font-medium ${RISK_BADGE[r.risk_level]}`}
                    >
                      {RISK_LABEL[r.risk_level]}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Eingaben zurücksetzen
        </button>
      </div>
    </form>
  );
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="mb-4">
        <h2 className="flex items-baseline gap-2 text-lg font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {step}
          </span>
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </header>
      {children}
    </section>
  );
}
