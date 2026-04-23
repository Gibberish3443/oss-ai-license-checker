<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deploy-Hinweise (GitHub Pages)

- `basePath` in [`next.config.ts`](next.config.ts) zeigt auf den Repo-Subpfad und greift nur im Produktions-Build; `npm run dev` bleibt unter [http://localhost:3000](http://localhost:3000) erreichbar.
- [`public/.nojekyll`](public/.nojekyll) verhindert, dass GitHub Pages den `_next/`-Ordner als Jekyll-Pfad wegfiltert.
- Einmalige Repo-Einrichtung: *Settings → Pages → Source: GitHub Actions*.
