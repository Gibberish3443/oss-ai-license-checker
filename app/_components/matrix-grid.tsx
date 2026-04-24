"use client";

import { useMemo, useState } from "react";
import type { CellStatus, CheckResult, License, Model } from "@/lib/types";

interface Props {
  result: CheckResult;
  modelById: Map<string, Model>;
  licenseById: Map<string, License>;
}

const STATUS_LABEL: Record<CellStatus, string> = {
  compatible: "OK",
  conditional: "Auflagen",
  incompatible: "Blocker",
  missing: "Offen",
  self: "Identisch",
};

const STATUS_DETAIL_LABEL: Record<CellStatus, string> = {
  compatible: "kompatibel",
  conditional: "mit Auflagen",
  incompatible: "inkompatibel",
  missing: "ungeprüft",
  self: "identische Lizenz",
};

const STATUS_CELL: Record<CellStatus, string> = {
  compatible:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/50",
  conditional:
    "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/50",
  incompatible:
    "border-red-200 bg-red-50 text-red-900 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/50",
  missing:
    "border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
  self: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/50",
};

const STATUS_DOT: Record<CellStatus, string> = {
  compatible: "bg-emerald-600 dark:bg-emerald-400",
  conditional: "bg-amber-600 dark:bg-amber-400",
  incompatible: "bg-red-600 dark:bg-red-400",
  missing: "bg-stone-500 dark:bg-stone-400",
  self: "bg-sky-600 dark:bg-sky-400",
};

interface SelectedCell {
  rowIndex: number;
  colIndex: number;
}

export default function MatrixGrid({ result, modelById, licenseById }: Props) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const fallbackCell = result.matrix[0]?.[0]
    ? { rowIndex: 0, colIndex: 0 }
    : null;
  const activeCellPointer = selectedCell ?? fallbackCell;

  const activeCell = activeCellPointer
    ? result.matrix[activeCellPointer.rowIndex]?.[activeCellPointer.colIndex]
    : null;

  const activeMeta = useMemo(() => {
    if (!activeCellPointer || !activeCell) return null;
    const row = result.rows[activeCellPointer.rowIndex];
    const col = result.cols[activeCellPointer.colIndex];
    const model = row ? modelById.get(row.model_id) : null;
    const rowLicense = row ? licenseById.get(row.license_id) : null;
    const colLicense = col ? licenseById.get(col.license_id) : null;
    return { row, col, model, rowLicense, colLicense };
  }, [activeCellPointer, activeCell, result.rows, result.cols, modelById, licenseById]);

  if (result.rows.length === 0 || result.cols.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
        Noch keine Matrix: Es fehlen{" "}
        {result.rows.length === 0 ? "Modelle" : "Code-Abhängigkeiten"}. Der
        Report kann trotzdem Use-Case- und Trainingsdaten-Hinweise anzeigen.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <MobileMatrixList
        result={result}
        modelById={modelById}
        licenseById={licenseById}
        activeCellPointer={activeCellPointer}
        onSelect={setSelectedCell}
      />

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-background px-2 py-2 text-left align-bottom font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-500"
              >
                Modell
              </th>
              {result.cols.map((col) => {
                const license = licenseById.get(col.license_id);
                return (
                  <th
                    key={col.license_id}
                    scope="col"
                    className="min-w-[132px] px-2 py-2 text-left align-bottom"
                  >
                    <div className="text-xs font-semibold leading-tight">
                      {license?.name ?? col.license_id}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-500">
                      {col.dep_count} {col.dep_count === 1 ? "Dep" : "Deps"}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => {
              const model = modelById.get(row.model_id);
              const rowLicense = licenseById.get(row.license_id);
              return (
                <tr key={row.model_id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[190px] bg-background px-2 py-2 text-left align-top"
                  >
                    <div className="font-semibold leading-tight">
                      {model?.name ?? row.model_id}
                    </div>
                    <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                      {rowLicense?.name ?? row.license_id}
                    </div>
                  </th>
                  {result.matrix[rowIndex]?.map((cell, colIndex) => {
                    const selected =
                      activeCellPointer?.rowIndex === rowIndex &&
                      activeCellPointer?.colIndex === colIndex;
                    return (
                      <td key={`${cell.row}:${cell.col}`} className="align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedCell({ rowIndex, colIndex })}
                          aria-pressed={selected}
                          aria-label={`${STATUS_DETAIL_LABEL[cell.status]}${
                            cell.reviewed_by_user === false
                              ? ", generisch bewertet"
                              : ""
                          }`}
                          className={`grid h-[64px] w-full min-w-[118px] place-items-center gap-1 rounded-md border p-2 text-center transition-all ${
                            STATUS_CELL[cell.status]
                          } ${
                            cell.reviewed_by_user === false
                              ? "border-dashed"
                              : ""
                          } ${
                            selected
                              ? "ring-2 ring-stone-950 ring-offset-2 ring-offset-background dark:ring-stone-50"
                              : ""
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[cell.status]}`}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                            {STATUS_LABEL[cell.status]}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <aside className="rounded-md border border-stone-300 bg-white/80 p-4 dark:border-stone-800 dark:bg-stone-950/70 xl:sticky xl:top-6 xl:self-start">
        {activeCell && activeMeta ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Zell-Details
            </p>
            <h4 className="mt-2 text-xl font-semibold leading-tight">
              {STATUS_DETAIL_LABEL[activeCell.status]}
            </h4>
            <div className="mt-4 space-y-3 text-sm">
              <DetailLine label="Modell" value={activeMeta.model?.name ?? activeCell.row} />
              <DetailLine
                label="Modelllizenz"
                value={activeMeta.rowLicense?.name ?? activeMeta.row?.license_id ?? "-"}
              />
              <DetailLine
                label="Code-Lizenz"
                value={activeMeta.colLicense?.name ?? activeMeta.col?.license_id ?? "-"}
              />
              <DetailLine
                label="Review"
                value={
                  activeCell.status === "self"
                    ? "identische Lizenz"
                    : activeCell.reviewed_by_user === true
                      ? "manuell reviewed"
                      : activeCell.reviewed_by_user === false
                        ? "generisch bewertet"
                        : "identische Lizenz"
                }
              />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {activeCell.reasoning}
            </p>
            {activeCell.caveats.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {activeCell.caveats.map((caveat) => (
                  <li key={caveat} className="border-l-2 border-stone-300 pl-3 dark:border-stone-700">
                    {caveat}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Wähle eine Matrixzelle für die Begründung.
          </p>
        )}
      </aside>
    </div>
  );
}

function MobileMatrixList({
  result,
  modelById,
  licenseById,
  activeCellPointer,
  onSelect,
}: {
  result: CheckResult;
  modelById: Map<string, Model>;
  licenseById: Map<string, License>;
  activeCellPointer: SelectedCell | null;
  onSelect: (cell: SelectedCell) => void;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      {result.rows.map((row, rowIndex) => {
        const model = modelById.get(row.model_id);
        const rowLicense = licenseById.get(row.license_id);
        return (
          <section
            key={row.model_id}
            className="rounded-md border border-stone-300 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-950/50"
          >
            <div className="mb-3">
              <div className="text-sm font-semibold">{model?.name ?? row.model_id}</div>
              <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                {rowLicense?.name ?? row.license_id}
              </div>
            </div>
            <div className="grid gap-2">
              {result.matrix[rowIndex]?.map((cell, colIndex) => {
                const col = result.cols[colIndex];
                const license = col ? licenseById.get(col.license_id) : null;
                const selected =
                  activeCellPointer?.rowIndex === rowIndex &&
                  activeCellPointer?.colIndex === colIndex;
                return (
                  <button
                    key={`${cell.row}:${cell.col}`}
                    type="button"
                    onClick={() => onSelect({ rowIndex, colIndex })}
                    aria-pressed={selected}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-all ${
                      STATUS_CELL[cell.status]
                    } ${
                      selected
                        ? "ring-2 ring-stone-950 ring-offset-2 ring-offset-background dark:ring-stone-50"
                        : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {license?.name ?? cell.col}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
                        {col?.dep_count ?? 0} {col?.dep_count === 1 ? "Dep" : "Deps"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[cell.status]}`}
                        aria-hidden="true"
                      />
                      {STATUS_LABEL[cell.status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-500">
        {label}
      </div>
      <div className="mt-0.5 text-stone-900 dark:text-stone-100">{value}</div>
    </div>
  );
}
