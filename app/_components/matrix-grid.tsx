"use client";

import type {
  CellStatus,
  CheckResult,
  License,
  Model,
} from "@/lib/types";

interface Props {
  result: CheckResult;
  modelById: Map<string, Model>;
  licenseById: Map<string, License>;
}

const STATUS_LABEL: Record<CellStatus, string> = {
  compatible: "kompatibel",
  conditional: "mit Auflagen",
  incompatible: "inkompatibel",
  missing: "ungeprüft",
  self: "identisch",
};

const STATUS_CELL: Record<CellStatus, string> = {
  compatible:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  conditional:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  incompatible: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  missing:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 italic",
  self: "bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
};

export default function MatrixGrid({
  result,
  modelById,
  licenseById,
}: Props) {
  if (result.rows.length === 0 || result.cols.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Matrix: Es fehlen {result.rows.length === 0 ? "Modelle" : "Code-Abhängigkeiten"}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-3 py-2 text-left align-bottom font-semibold dark:border-zinc-800 dark:bg-zinc-950"
            >
              Modell → / Code-Lizenz ↓
            </th>
            {result.cols.map((col) => {
              const license = licenseById.get(col.license_id);
              return (
                <th
                  key={col.license_id}
                  scope="col"
                  className="border-b border-zinc-200 px-3 py-2 text-left align-bottom dark:border-zinc-800"
                >
                  <div className="font-semibold">{license?.name ?? col.license_id}</div>
                  <div className="text-[0.7rem] font-normal text-zinc-500 dark:text-zinc-400">
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
                  className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-3 py-2 text-left align-top dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="font-semibold">{model?.name ?? row.model_id}</div>
                  <div className="mt-0.5 text-[0.7rem] font-normal text-zinc-500 dark:text-zinc-400">
                    {rowLicense?.name ?? row.license_id}
                  </div>
                </th>
                {result.matrix[rowIndex]?.map((cell) => (
                  <td
                    key={`${cell.row}:${cell.col}`}
                    className={`border-b border-zinc-200 px-3 py-2 align-top dark:border-zinc-800 ${STATUS_CELL[cell.status]}`}
                    title={cell.reasoning}
                  >
                    <div className="font-semibold">{STATUS_LABEL[cell.status]}</div>
                    {cell.caveats.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {cell.caveats.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
