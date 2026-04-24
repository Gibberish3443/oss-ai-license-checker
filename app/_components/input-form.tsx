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

const RISK_DOT: Record<TrainingDataRisk["risk_level"], string> = {
  low: "bg-emerald-700 dark:bg-emerald-400",
  medium: "bg-amber-700 dark:bg-amber-400",
  high: "bg-red-700 dark:bg-red-400",
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
      className="flex flex-col gap-10"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Eingabemaske"
    >
      <Section
        rubric="Schritt 01 / Use-Case"
        title="Use-Case"
        description="Wofür soll die Kombination eingesetzt werden? Steuert, welche Szenario-Spalte der Matrix ausgewertet wird."
      >
        <fieldset className="divide-y divide-stone-200 dark:divide-stone-800">
          <legend className="sr-only">Use-Case</legend>
          {useCases.map((uc) => {
            const active = useCase === uc.id;
            return (
              <label
                key={uc.id}
                className={`flex cursor-pointer gap-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-l-2 border-[var(--accent-ink)] bg-stone-100 pl-3 dark:bg-stone-900"
                    : "border-l-2 border-transparent pl-3 hover:bg-stone-50 dark:hover:bg-stone-900/60"
                }`}
              >
                <input
                  type="radio"
                  name="useCase"
                  value={uc.id}
                  checked={active}
                  onChange={() => onUseCaseChange(uc.id)}
                  className="mt-1 accent-stone-800 dark:accent-stone-200"
                />
                <span className="flex-1">
                  <span className="block font-medium">{uc.name}</span>
                  <span className="mt-1 block text-xs text-stone-600 dark:text-stone-400">
                    {uc.description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      <Section
        rubric="Schritt 02 / Modelle"
        title="Modelle"
        description="Welche Open-Weight-Modelle sollen geprüft werden? Jedes Modell zieht seine Modelllizenz in die Matrix."
      >
        <fieldset className="divide-y divide-stone-200 dark:divide-stone-800">
          <legend className="sr-only">Modelle</legend>
          {models.map((m) => {
            const license = licenseById.get(m.license_id);
            const checked = selectedModels.includes(m.id);
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer gap-3 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-l-2 border-[var(--accent-ink)] bg-stone-100 pl-3 dark:bg-stone-900"
                    : "border-l-2 border-transparent pl-3 hover:bg-stone-50 dark:hover:bg-stone-900/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onModelsChange(toggleInArray(selectedModels, m.id))}
                  className="mt-1 accent-stone-800 dark:accent-stone-200"
                />
                <span className="flex-1">
                  <span className="block font-medium">{m.name}</span>
                  <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">
                    {m.vendor}
                  </span>
                  <span className="mt-1 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                    {license?.name ?? m.license_id}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      <Section
        rubric="Schritt 03 / Code-Deps"
        title="Code-Abhängigkeiten"
        description="Lizenzen der im Projekt verwendeten Libraries. Mehrere Deps pro Lizenz? Anzahl rechts anpassen."
      >
        <fieldset className="divide-y divide-stone-200 dark:divide-stone-800">
          <legend className="sr-only">Code-Abhängigkeiten</legend>
          {licenses.map((l) => {
            const count = codeDepCounts[l.id] ?? 0;
            const active = count > 0;
            return (
              <div
                key={l.id}
                className={`flex items-start gap-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-l-2 border-[var(--accent-ink)] bg-stone-100 pl-3 dark:bg-stone-900"
                    : "border-l-2 border-transparent pl-3"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDep(l.id)}
                  className="mt-1 accent-stone-800 dark:accent-stone-200"
                  aria-label={`${l.name} als Abhängigkeit aufnehmen`}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block font-medium">{l.name}</span>
                      <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">
                        {l.category}
                      </span>
                    </div>
                    <label className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                      <span aria-hidden="true">Anzahl</span>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={count}
                        onChange={(e) => updateDepCount(l.id, e.target.value)}
                        aria-label={`Anzahl Abhängigkeiten mit Lizenz ${l.name}`}
                        className="w-14 border-0 border-b border-stone-400 bg-transparent px-0 py-0.5 text-right font-mono text-sm text-stone-900 focus:border-[var(--accent-ink)] focus:outline-none focus:ring-0 dark:border-stone-600 dark:text-stone-100"
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
        rubric="Schritt 04 / Trainingsdaten"
        title="Trainingsdaten-Risiken"
        description="Bekannte Risiken aus den Trainingskorpora der eingesetzten Modelle. Optional, beeinflusst die Ampel ab Risiko „mittel“."
      >
        <fieldset className="divide-y divide-stone-200 dark:divide-stone-800">
          <legend className="sr-only">Trainingsdaten-Risiken</legend>
          {trainingRisks.map((r) => {
            const checked = selectedTrainingRisks.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex cursor-pointer gap-3 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-l-2 border-[var(--accent-ink)] bg-stone-100 pl-3 dark:bg-stone-900"
                    : "border-l-2 border-transparent pl-3 hover:bg-stone-50 dark:hover:bg-stone-900/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onTrainingRisksChange(toggleInArray(selectedTrainingRisks, r.id))
                  }
                  className="mt-1 accent-stone-800 dark:accent-stone-200"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <span
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400"
                      aria-label={`Risiko ${RISK_LABEL[r.risk_level]}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-1.5 w-1.5 rounded-full ${RISK_DOT[r.risk_level]}`}
                      />
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
          className="font-serif text-[14px] italic text-stone-600 transition-colors hover:text-[var(--accent-gold)] dark:text-stone-400 dark:hover:text-[var(--accent-gold)]"
        >
          Eingaben zurücksetzen
        </button>
      </div>
    </form>
  );
}

function Section({
  rubric,
  title,
  description,
  children,
}: {
  rubric: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-300 pt-8 first:border-t-0 first:pt-0 dark:border-stone-700">
      <header className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
          {rubric}
        </p>
        <h2 className="mt-2 font-serif text-[28px] leading-[1.05] tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}
