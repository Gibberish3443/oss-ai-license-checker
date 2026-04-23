"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-700 dark:bg-red-950/40"
        >
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Unerwarteter Fehler
          </h2>
          <p className="mt-2 text-sm text-red-900/90 dark:text-red-100/90">
            Die Prüfung konnte wegen eines internen Fehlers nicht gerendert
            werden. Das ist ein Bug im Checker, keine Eingabefehler-Meldung —
            Details stehen in der Browser-Konsole.
          </p>
          {error.digest ? (
            <p className="mt-3 font-mono text-xs text-red-900/70 dark:text-red-100/70">
              digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-5 inline-flex items-center rounded-md border border-red-400 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-600 dark:bg-zinc-900 dark:text-red-100 dark:hover:bg-zinc-800"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    </div>
  );
}
