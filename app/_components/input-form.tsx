"use client";

import { useMemo, useState } from "react";
import type {
  License,
  LicenseCategory,
  Model,
  TrainingDataRisk,
  UseCase,
  UseCaseId,
} from "@/lib/types";

export type FlowStep = "use-case" | "license" | "code" | "training" | "result";

interface Props {
  flowStep: FlowStep;
  onFlowStepChange: (next: FlowStep) => void;
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
  useCase: UseCaseId | null;
  onUseCaseChange: (next: UseCaseId) => void;
  onReset: () => void;
}

type CategoryFilter = LicenseCategory | "all";

const FLOW_STEPS: Array<{ id: FlowStep; label: string; caption: string }> = [
  { id: "use-case", label: "Use Case", caption: "Kontext" },
  { id: "license", label: "Lizenzprofil", caption: "Modelle" },
  { id: "code", label: "Code-Deps", caption: "Code" },
  { id: "training", label: "Trainingsdaten", caption: "Risiko" },
  { id: "result", label: "Ergebnis", caption: "Report" },
];

const CATEGORY_LABEL: Record<LicenseCategory, string> = {
  "osi-permissive": "OSI permissive",
  "osi-weak-copyleft": "Weak copyleft",
  "osi-strong-copyleft": "Strong copyleft",
  "public-domain": "Public domain",
  "source-available-restricted": "Source-available",
  "research-only": "Research-only",
  "proprietary-api-only": "Proprietary/API",
  "multi-tier-licensing": "Multi-tier",
};

const CATEGORY_HELP: Record<LicenseCategory, string> = {
  "osi-permissive": "MIT, Apache, BSD und ähnliche Low-Friction-Lizenzen.",
  "osi-weak-copyleft": "Copyleft mit engerem Trigger, etwa LGPL, MPL oder EPL.",
  "osi-strong-copyleft": "GPL-/AGPL-nahe Pflichten mit höherer Integrationswirkung.",
  "public-domain": "CC0, Unlicense und public-domain-nahe Freigaben.",
  "source-available-restricted":
    "Open weights mit Anbieterbedingungen, Schwellen oder AUP.",
  "research-only": "Nicht-kommerzielle oder forschungsgebundene Regime.",
  "proprietary-api-only": "Nur API-/Plattformnutzung, keine offene Gewichtslizenz.",
  "multi-tier-licensing": "Mehrere Lizenzstufen je nach Nutzungsschwelle.",
};

const RISK_LABEL: Record<TrainingDataRisk["risk_level"], string> = {
  low: "niedrig",
  medium: "mittel",
  high: "hoch",
};

const RISK_DOT: Record<TrainingDataRisk["risk_level"], string> = {
  low: "bg-emerald-600 dark:bg-emerald-400",
  medium: "bg-amber-600 dark:bg-amber-400",
  high: "bg-red-600 dark:bg-red-400",
};

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function uniqueCategories(categories: CategoryFilter[]): CategoryFilter[] {
  return Array.from(new Set(categories));
}

function nextFlowStep(step: FlowStep): FlowStep {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  return FLOW_STEPS[Math.min(index + 1, FLOW_STEPS.length - 1)].id;
}

function previousFlowStep(step: FlowStep): FlowStep {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  return FLOW_STEPS[Math.max(index - 1, 0)].id;
}

function shortUseCaseName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

export default function InputForm({
  flowStep,
  onFlowStepChange,
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
  const [modelCategory, setModelCategory] = useState<CategoryFilter>("all");
  const [modelSearch, setModelSearch] = useState("");
  const [depSearch, setDepSearch] = useState("");

  const selectedUseCase = useCase
    ? (useCases.find((candidate) => candidate.id === useCase) ?? null)
    : null;

  const modelCategoryCounts = useMemo(() => {
    const counts = new Map<LicenseCategory, number>();
    for (const model of models) {
      const category = licenseById.get(model.license_id)?.category;
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [models, licenseById]);

  const modelCategories = uniqueCategories([
    "all",
    ...models
      .map((model) => licenseById.get(model.license_id)?.category)
      .filter((category): category is LicenseCategory => Boolean(category)),
  ]);

  const normalizedModelSearch = modelSearch.trim().toLowerCase();
  const filteredModels = models.filter((model) => {
    const license = licenseById.get(model.license_id);
    const matchesCategory =
      modelCategory === "all" || license?.category === modelCategory;
    if (!matchesCategory) return false;
    if (!normalizedModelSearch) return true;
    const haystack = [model.name, model.vendor, license?.name ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedModelSearch);
  });

  const normalizedDepSearch = depSearch.trim().toLowerCase();
  const filteredLicenses = licenses.filter((license) => {
    if (!normalizedDepSearch) return true;
    return `${license.name} ${license.id}`
      .toLowerCase()
      .includes(normalizedDepSearch);
  });

  const selectedDepEntries = Object.entries(codeDepCounts)
    .map(([licenseId, count]) => ({
      licenseId,
      count,
      license: licenseById.get(licenseId),
    }))
    .filter((entry) => entry.count > 0);

  const canAdvance =
    (flowStep === "use-case" && Boolean(useCase)) ||
    (flowStep === "license" && selectedModels.length > 0) ||
    flowStep === "code" ||
    flowStep === "training";

  function selectUseCase(next: UseCaseId) {
    onUseCaseChange(next);
    onFlowStepChange("license");
  }

  function setDepCount(licenseId: string, nextCount: number) {
    const next = { ...codeDepCounts };
    const count = Math.max(0, Math.min(999, Math.floor(nextCount)));
    if (count <= 0) {
      delete next[licenseId];
    } else {
      next[licenseId] = count;
    }
    onCodeDepCountsChange(next);
  }

  function continueFlow() {
    if (!canAdvance) return;
    onFlowStepChange(nextFlowStep(flowStep));
  }

  if (flowStep === "result") {
    return (
      <section className="flow-panel rounded-md border border-stone-300 bg-white/75 p-4 dark:border-stone-800 dark:bg-stone-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Eingaben
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <SummaryPill label="Use Case" value={selectedUseCase?.name ?? "offen"} />
              <SummaryPill label="Modelle" value={String(selectedModels.length)} />
              <SummaryPill label="Code-Deps" value={String(selectedDepEntries.length)} />
              <SummaryPill label="Risiken" value={String(selectedTrainingRisks.length)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFlowStepChange("training")}
              className="inline-flex h-9 items-center rounded-md border border-stone-300 px-3 text-sm transition-colors hover:border-stone-900 hover:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-100 dark:hover:bg-stone-900"
            >
              Eingaben anpassen
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center rounded-md border border-transparent px-3 text-sm text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-50"
            >
              Neu starten
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flow-panel" aria-label="Geführter Lizenzcheck">
      {flowStep !== "use-case" && (
        <StepRail
          flowStep={flowStep}
          selectedUseCase={selectedUseCase}
          selectedModels={selectedModels.length}
          selectedDeps={selectedDepEntries.length}
          selectedTrainingRisks={selectedTrainingRisks.length}
          onStepClick={onFlowStepChange}
        />
      )}

      {flowStep === "use-case" && (
        <UseCaseMatrix useCases={useCases} useCase={useCase} onSelect={selectUseCase} />
      )}

      {flowStep === "license" && (
        <StepFrame
          kicker="Schritt 02"
          title="Lizenzprofil und Modelle"
          description="Erst die Lizenzkategorie filtern oder direkt nach Modellname suchen, dann konkrete Modelle auswählen."
          onBack={() => onFlowStepChange(previousFlowStep(flowStep))}
          onNext={continueFlow}
          nextLabel="Weiter zu Code-Deps"
          nextDisabled={!canAdvance}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <CategoryChooser
                categories={modelCategories}
                counts={modelCategoryCounts}
                value={modelCategory}
                onChange={setModelCategory}
              />
            </div>
            <SearchInput
              value={modelSearch}
              onChange={setModelSearch}
              placeholder="Modell oder Hersteller suchen"
              ariaLabel="Modelle durchsuchen"
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredModels.map((model) => {
              const license = licenseById.get(model.license_id);
              const checked = selectedModels.includes(model.id);
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => onModelsChange(toggleInArray(selectedModels, model.id))}
                  className={`group min-h-[112px] rounded-md border p-3 text-left transition-colors ${
                    checked
                      ? "border-stone-950 bg-stone-950 text-stone-50 shadow-sm dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
                      : "border-stone-300 bg-white/70 hover:border-stone-900 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:hover:border-stone-100 dark:hover:bg-stone-950"
                  }`}
                  aria-pressed={checked}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[15px] font-semibold leading-tight">
                        {model.name}
                      </div>
                      <div
                        className={`mt-1 text-xs ${
                          checked
                            ? "text-stone-300 dark:text-stone-700"
                            : "text-stone-600 dark:text-stone-400"
                        }`}
                      >
                        {model.vendor}
                      </div>
                    </div>
                    <span
                      className={`h-5 min-w-5 border text-center font-mono text-[11px] leading-5 ${
                        checked
                          ? "border-stone-50 dark:border-stone-950"
                          : "border-stone-400 dark:border-stone-600"
                      }`}
                      aria-hidden="true"
                    >
                      {checked ? "✓" : "+"}
                    </span>
                  </div>
                  <div
                    className={`mt-4 font-mono text-[10px] uppercase tracking-[0.15em] ${
                      checked
                        ? "text-stone-300 dark:text-stone-700"
                        : "text-stone-500 dark:text-stone-500"
                    }`}
                  >
                    {license ? CATEGORY_LABEL[license.category] : model.license_id}
                  </div>
                  <p
                    className={`mt-2 line-clamp-2 text-xs leading-relaxed ${
                      checked
                        ? "text-stone-200 dark:text-stone-700"
                        : "text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    {license?.name ?? model.license_id}
                  </p>
                </button>
              );
            })}
          </div>
        </StepFrame>
      )}

      {flowStep === "code" && (
        <StepFrame
          kicker="Schritt 03"
          title="Code Dependencies"
          description="Direkt nach der Lizenz suchen und die Anzahl per Stepper setzen. Die gewählten Pakete erscheinen unten als Überblick."
          onBack={() => onFlowStepChange(previousFlowStep(flowStep))}
          onNext={continueFlow}
          nextLabel="Weiter zu Trainingsdaten"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
              {filteredLicenses.length} Lizenzen · {selectedDepEntries.length} ausgewählt
            </p>
            <SearchInput
              value={depSearch}
              onChange={setDepSearch}
              placeholder="Lizenz suchen (Name oder SPDX-ID)"
              ariaLabel="Code-Lizenzen durchsuchen"
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLicenses.map((license) => {
              const count = codeDepCounts[license.id] ?? 0;
              return (
                <div
                  key={license.id}
                  className={`rounded-md border p-3 transition-colors ${
                    count > 0
                      ? "border-stone-950 bg-stone-950 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
                      : "border-stone-300 bg-white/60 dark:border-stone-800 dark:bg-stone-950/50"
                  }`}
                >
                  <div className="flex min-h-[58px] flex-col">
                    <span className="font-medium leading-tight">{license.name}</span>
                    <span
                      className={`mt-2 font-mono text-[10px] uppercase tracking-[0.16em] ${
                        count > 0
                          ? "text-stone-300 dark:text-stone-700"
                          : "text-stone-500 dark:text-stone-500"
                      }`}
                    >
                      {CATEGORY_LABEL[license.category]}
                    </span>
                  </div>
                  <Stepper
                    value={count}
                    onDecrease={() => setDepCount(license.id, count - 1)}
                    onIncrease={() => setDepCount(license.id, count + 1)}
                    onClear={() => setDepCount(license.id, 0)}
                    active={count > 0}
                    label={license.name}
                  />
                </div>
              );
            })}
          </div>

          <SelectionTray
            entries={selectedDepEntries}
            onRemove={(licenseId) => setDepCount(licenseId, 0)}
          />
        </StepFrame>
      )}

      {flowStep === "training" && (
        <StepFrame
          kicker="Schritt 04"
          title="Trainingsdaten-Risiken"
          description="Optionaler Kontext für die Ampel. Die Auswahl bleibt kompakt und wird später im Ergebnis getrennt ausgewiesen."
          onBack={() => onFlowStepChange(previousFlowStep(flowStep))}
          onNext={continueFlow}
          nextLabel="Ergebnis anzeigen"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trainingRisks.map((risk) => {
              const checked = selectedTrainingRisks.includes(risk.id);
              return (
                <button
                  key={risk.id}
                  type="button"
                  onClick={() =>
                    onTrainingRisksChange(
                      toggleInArray(selectedTrainingRisks, risk.id),
                    )
                  }
                  className={`min-h-[104px] rounded-md border p-3 text-left transition-colors ${
                    checked
                      ? "border-stone-950 bg-stone-950 text-stone-50 shadow-sm dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
                      : "border-stone-300 bg-white/70 hover:border-stone-900 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:hover:border-stone-100 dark:hover:bg-stone-950"
                  }`}
                  aria-pressed={checked}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[15px] font-semibold leading-tight">
                      {risk.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] ${
                        checked
                          ? "text-stone-300 dark:text-stone-700"
                          : "text-stone-500 dark:text-stone-500"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${RISK_DOT[risk.risk_level]}`}
                      />
                      {RISK_LABEL[risk.risk_level]}
                    </span>
                  </div>
                  <p
                    className={`mt-4 text-xs leading-relaxed ${
                      checked
                        ? "text-stone-200 dark:text-stone-700"
                        : "text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    {risk.legal_issues[0]?.issue ?? "Prüfhinweis"}
                  </p>
                </button>
              );
            })}
          </div>
        </StepFrame>
      )}
    </section>
  );
}

function UseCaseMatrix({
  useCases,
  useCase,
  onSelect,
}: {
  useCases: UseCase[];
  useCase: UseCaseId | null;
  onSelect: (next: UseCaseId) => void;
}) {
  return (
    <div className="flow-panel rounded-md border border-stone-300 bg-white/75 p-4 dark:border-stone-800 dark:bg-stone-950/60 sm:p-6">
      <div className="mb-5 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
          Startpunkt
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
          Wofür wird die KI-Komposition eingesetzt?
        </h2>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Erst der Kontext, dann die Details. Die vier Use Cases bestimmen, welche
          Lizenzpflichten in der Matrix scharf gestellt werden.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {useCases.map((candidate, index) => {
          const active = useCase === candidate.id;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelect(candidate.id)}
              className={`group min-h-[150px] rounded-md border p-4 text-left transition-colors duration-200 ${
                active
                  ? "border-stone-950 bg-stone-950 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
                  : "border-stone-300 bg-white/75 hover:border-stone-950 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:hover:border-stone-100 dark:hover:bg-stone-950"
              }`}
            >
              <span
                className={`font-mono text-[11px] uppercase tracking-[0.2em] ${
                  active
                    ? "text-stone-300 dark:text-stone-700"
                    : "text-stone-500 dark:text-stone-500"
                }`}
              >
                0{index + 1}
              </span>
              <h3 className="mt-6 text-lg font-semibold leading-tight">
                {shortUseCaseName(candidate.name)}
              </h3>
              <p
                className={`mt-2 line-clamp-2 text-sm leading-relaxed ${
                  active
                    ? "text-stone-200 dark:text-stone-700"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                {candidate.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepRail({
  flowStep,
  selectedUseCase,
  selectedModels,
  selectedDeps,
  selectedTrainingRisks,
  onStepClick,
}: {
  flowStep: FlowStep;
  selectedUseCase: UseCase | null;
  selectedModels: number;
  selectedDeps: number;
  selectedTrainingRisks: number;
  onStepClick: (next: FlowStep) => void;
}) {
  const currentIndex = FLOW_STEPS.findIndex((step) => step.id === flowStep);

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-1 rounded-md border border-stone-300 bg-stone-100 p-1 dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-4">
        {FLOW_STEPS.slice(0, -1).map((step, index) => {
          const active = step.id === flowStep;
          const done = index < currentIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`rounded px-3 py-2 text-left transition-colors ${
                active
                  ? "bg-stone-950 text-stone-50 shadow-sm dark:bg-stone-50 dark:text-stone-950"
                  : done
                    ? "bg-white text-stone-800 dark:bg-stone-950 dark:text-stone-200"
                    : "text-stone-500 hover:bg-white/70 dark:text-stone-500 dark:hover:bg-stone-950/70"
              }`}
            >
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em]">
                {step.caption}
              </span>
              <span className="mt-1 block text-sm font-medium">{step.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 hidden flex-wrap gap-2 md:flex">
        <SummaryPill label="Use Case" value={selectedUseCase?.name ?? "offen"} />
        <SummaryPill label="Modelle" value={String(selectedModels)} />
        <SummaryPill label="Code-Deps" value={String(selectedDeps)} />
        <SummaryPill label="Risiken" value={String(selectedTrainingRisks)} />
      </div>
    </div>
  );
}

function StepFrame({
  kicker,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flow-panel rounded-md border border-stone-300 bg-white/75 p-4 dark:border-stone-800 dark:bg-stone-950/60 sm:p-6">
      <header className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-500">
          {kicker}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">
          {title}
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {description}
        </p>
      </header>

      {children}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-300 pt-4 dark:border-stone-700">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center rounded-md border border-stone-300 px-4 text-sm transition-colors hover:border-stone-950 hover:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-50 dark:hover:bg-stone-900"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex h-10 items-center rounded-md bg-stone-950 px-5 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function CategoryChooser({
  categories,
  counts,
  value,
  onChange,
}: {
  categories: CategoryFilter[];
  counts: Map<LicenseCategory, number>;
  value: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const active = value === category;
        const label = category === "all" ? "Alle Kategorien" : CATEGORY_LABEL[category];
        const count =
          category === "all"
            ? Array.from(counts.values()).reduce((sum, item) => sum + item, 0)
            : counts.get(category) ?? 0;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            title={category === "all" ? "Gesamten Katalog zeigen." : CATEGORY_HELP[category]}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${
              active
                ? "border-stone-950 bg-stone-950 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
                : "border-stone-300 bg-white/70 hover:border-stone-900 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:hover:border-stone-100"
            }`}
          >
            <span>{label}</span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                active
                  ? "text-stone-200 dark:text-stone-700"
                  : "text-stone-500 dark:text-stone-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  onDecrease,
  onIncrease,
  onClear,
  active,
  label,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onClear: () => void;
  active: boolean;
  label: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <div className="inline-grid grid-cols-[34px_42px_34px] overflow-hidden rounded-md border border-current/30">
        <button
          type="button"
          onClick={onDecrease}
          className="h-8 border-r border-current/30 text-lg leading-none transition-colors hover:bg-current/10"
          aria-label={`${label} reduzieren`}
        >
          -
        </button>
        <output className="grid h-8 place-items-center font-mono text-sm">{value}</output>
        <button
          type="button"
          onClick={onIncrease}
          className="h-8 border-l border-current/30 text-lg leading-none transition-colors hover:bg-current/10"
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      </div>
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-70 transition-opacity hover:opacity-100"
        >
          Entfernen
        </button>
      )}
    </div>
  );
}

function SelectionTray({
  entries,
  onRemove,
}: {
  entries: Array<{ licenseId: string; count: number; license?: License }>;
  onRemove: (licenseId: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-500">
        Noch keine Code-Lizenzen ausgewählt. Du kannst den Check auch ohne
        Code-Schicht fortsetzen.
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md border border-stone-300 bg-stone-100/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
        Ausgewählte Code-Schicht
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <button
            key={entry.licenseId}
            type="button"
            onClick={() => onRemove(entry.licenseId)}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm transition-colors hover:border-red-700 hover:text-red-700 dark:border-stone-700 dark:bg-stone-950 dark:hover:border-red-400 dark:hover:text-red-300"
          >
            <span>{entry.license?.name ?? entry.licenseId}</span>
            <span className="font-mono text-xs text-stone-500">x{entry.count}</span>
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded border border-stone-300 px-2.5 py-1 text-xs dark:border-stone-700">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-500">
        {label}
      </span>
      <span className="truncate text-stone-800 dark:text-stone-200">{value}</span>
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <label className="relative flex w-full items-center lg:w-72">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 font-mono text-[12px] text-stone-500"
      >
        /
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-9 w-full rounded-md border border-stone-300 bg-white/70 pl-7 pr-8 text-sm text-stone-900 placeholder:text-stone-500 focus:border-stone-950 focus:outline-none dark:border-stone-700 dark:bg-stone-950/50 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Suche leeren"
          className="absolute right-2 h-6 w-6 rounded text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          ×
        </button>
      )}
    </label>
  );
}
