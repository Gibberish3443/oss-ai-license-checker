# oss-ai-license-checker

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://gibberish3443.github.io/oss-ai-license-checker/)
[![Deploy](https://github.com/Gibberish3443/oss-ai-license-checker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Gibberish3443/oss-ai-license-checker/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Lizenz- und Compliance-Check für offene AI-Modelle: welches Modell darf wo, gegen welchen Stack, mit welchen Pflichten.

Der Fokus liegt auf Transparenz und Nachvollziehbarkeit der rechtlichen Einordnung, nicht
auf einer automatisierten „ja/nein"-Antwort.

## Motivation

SPDX liefert Lizenz-Identifier und mit dem AI-Profil (SPDX 3.0) inzwischen auch ein
Beschreibungsschema für Modell-Metadaten. Für die Compliance-*Entscheidung* im AI-Bereich reicht
das aber nicht aus. Es fehlen insbesondere:

- die Abgrenzung *Source-Available* gegenüber *OSI-approved* (Llama, frühere Gemma-Generationen)
- der Umgang mit *Responsible-AI*-Klauseln (OpenRAIL, Use-Based Restrictions)
- Multi-Tier-Lizenzierung, bei der ein Anbieter mehrere Varianten unter verschiedene Regime stellt
- Dimensionen jenseits des Urheberrechts: Exportkontrolle, Entity-List-Status, Jurisdiktion des
  Herausgebers

Das Tool ergänzt SPDX um diese Dimensionen und zwingt die Analyse zugleich in eine Form, die
reproduzierbar und zitierfähig bleibt.

## Was das Tool prüft

Die Compliance-Prüfung läuft entlang von drei Achsen und wird gegen einen gewählten Einsatz-Kontext
gespiegelt:

1. **Modell-Lizenzen** — welche Bedingungen der Anbieter an die Nutzung seiner Gewichte knüpft
   (z. B. Llama 4 Community License, Apache-2.0, MIT, modified MIT).
2. **Code-Abhängigkeiten** — die klassische OSS-Schicht um das Modell herum (MIT, Apache, BSD,
   MPL, LGPL, GPL, AGPL).
3. **Trainingsdaten-Risiken** — rechtliche Unsicherheiten aus der Datenbasis: TDM-Schranke und
   Opt-out (§ 44b UrhG, Art. 4 DSM-RL), Fair Use, DSGVO-Konformität bei personenbezogenen
   Crawl-Inhalten, Leistungsschutzrecht für Presseerzeugnisse.

Zusätzlich werden *Compliance-Flags* ausgewiesen, die nicht Teil der reinen Lizenzbewertung sind
(Entity-List-Status, Trainings-Hardware-Herkunft, Publisher-Jurisdiktion).

## Einsatz-Szenarien (Use Cases)

Die Bewertung ist ohne Kontext nicht belastbar. Das Tool unterscheidet vier Szenarien, die
unterschiedliche Klauseln scharf stellen:

| Szenario | Kurzbeschreibung | Kritische Klauseln |
|---|---|---|
| Research only | rein wissenschaftlich, kein Vertrieb | in der Regel unproblematisch, aber MRL-ähnliche Research-Only-Lizenzen bleiben bindend |
| Internal commercial | Einsatz innerhalb der Organisation | kommerzielle Nutzungserlaubnis nötig, Netzwerkklauseln irrelevant |
| SaaS external | gehosteter Dienst für externe Nutzer | AGPL-Netzwerkklausel, Llama-/Gemma-MAU-Schwellen, Revenue-Gates |
| Redistribution | Weitergabe von Modell oder Code | Attribution, NOTICE, Copyleft-Vererbung |

## Aktiver Modell-Scope

Die aktive Registry in [`lib/models.json`](lib/models.json) ist bewusst konservativ gehalten und
enthält zehn LLMs, die aktuell den Markt prägen:

- **[Llama 4 Maverick](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct)** — Source-available-Referenz mit MAU-Schwelle und AUP
- **[Gemma 4 31B](https://huggingface.co/google/gemma-4-31B-it)** — seit April 2026 unter Apache-2.0 (Ablösung der Gemma Terms)
- **[Qwen3-235B-A22B](https://huggingface.co/Qwen/Qwen3-235B-A22B)** — Apache-Generalist
- **[Qwen3-Coder-480B-A35B-Instruct](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct)** — Apache, Coding- und Agentic-Spezialist
- **[DeepSeek-V3.2](https://huggingface.co/deepseek-ai/DeepSeek-V3.2)** — MIT
- **[Phi-4-reasoning-plus](https://huggingface.co/microsoft/Phi-4-reasoning-plus)** — MIT
- **[Mistral Small 4](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603)** — Apache, praktisches Open-Hybrid-Modell
- **[Mistral Large 3](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512-BF16)** — Apache, offenes Mistral-Flaggschiff
- **[OLMo 3.1 32B Instruct](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct)** — vollständig offene Ai2-Referenz
- **[Kimi-K2-Instruct-0905](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905)** — modified MIT mit schwellenabhängiger Branding-Pflicht

Bildmodelle (FLUX.1, Stable Diffusion 3.5) und ältere Regime bleiben als Snapshot-Referenzen im
Korpus erhalten, sind aber nicht Teil der aktiven Matrix.

## Datenmodell

Zentrale Typen in [`lib/types.ts`](lib/types.ts):

- **`LicenseCategory`** — acht Kategorien von `osi-permissive` über `osi-strong-copyleft`,
  `source-available-restricted`, `research-only`, `proprietary-api-only` bis
  `multi-tier-licensing`
- **`LicenseRights`** — strukturierte Rechte-Matrix (commercial use, modification, distribution,
  patent grant, copyleft-Stärke)
- **`LicenseRestriction`** — einzelne Einschränkungsklauseln mit Quellenverweis und Zitat (≤ 15
  Wörter, siehe [`scripts/check-quotes.ts`](scripts/check-quotes.ts))
- **`AdditionalComplianceFlags`** — Entity-List-Status, Hardware-Herkunft, Jurisdiktion
- **`CompatibilityPair`** — paarweise Bewertung zweier Lizenzen, szenarioabhängig

Details zur Taxonomie siehe [`docs/taxonomy.md`](docs/taxonomy.md).

## Offline-Korpus

Alle zitierten Lizenztexte liegen als Snapshot im Repository unter
[`licenses/raw/`](licenses/raw/). Das hat zwei Gründe:

- **Nachvollziehbarkeit** — die Fassung, gegen die die Einordnung geschrieben ist, ist
  versionskontrolliert und nicht von späteren Änderungen beim Anbieter abhängig.
- **Beweislast** — für Modelle ohne eigene `LICENSE`-Datei (z. B. Gemma 4, Mistral Small 4,
  Mistral Large 3, OLMo 3.1) dient die Hugging-Face-Modellkarte als Vendor-Beleg, weil dort
  die Lizenz-Deklaration im YAML-Frontmatter steht.

Der Index inklusive Snapshot- und Vendor-Beleg-Zuordnung findet sich in
[`licenses/raw/INDEX.md`](licenses/raw/INDEX.md).

## Deploy

Statischer Next.js-Export auf GitHub Pages, ausgeliefert per GitHub Actions.
Jeder Push auf `master` triggert [`deploy.yml`](.github/workflows/deploy.yml) —
Typecheck, Lint, Tests, `next build`, `out/` als Pages-Artefakt hoch.

## Projekt-Struktur

```
app/                         Next.js App Router (UI)
docs/
  taxonomy.md                Taxonomie, Kategorien, Compliance-Flags
lib/
  types.ts                   Datenmodell
  licenses.json              Lizenz-Katalog (aktive + legacy)
  models.json                aktive LLM-Registry
  compatibility-matrix.json  paarweise Kompatibilitätsbewertung
  training-data-risks.json   rechtliche Risiken aus der Trainingsdatenlage
  use-cases.json             vier Einsatz-Szenarien
licenses/raw/                Offline-Korpus aller Lizenztexte und Vendor-Belege
scripts/                     Validierungs-Utilities
```

## Grenzen

Das Tool ersetzt keine individuelle Rechtsberatung. Die hinterlegten Einschätzungen sind
Momentaufnahmen zum im Snapshot dokumentierten Stand und können im Einzelfall durch aktuelle
Rechtsprechung, Anbieter-Änderungen oder spezielle Vertragsgestaltungen überholt sein.
Maßgeblich für die Rechtsanwendung bleibt immer die aktuelle Fassung beim Rechteinhaber.

Die Kompatibilitätsbewertungen in [`lib/compatibility-matrix.json`](lib/compatibility-matrix.json)
tragen ein Flag `reviewed_by_user`, mit dem unterschieden wird, welche Paare bereits manuell
geprüft und welche auf generischer Einordnung beruhen.

## Referenzen

- [Taxonomie-Dokumentation](docs/taxonomy.md)
- [Snapshot-Index](licenses/raw/INDEX.md)
- [SPDX License List](https://spdx.org/licenses/)
- [Open Source Initiative — approved licenses](https://opensource.org/licenses)

## Lizenz

Der Projekt-Quellcode steht unter der [MIT-Lizenz](LICENSE) und darf frei für jeden Zweck
inklusive kommerzieller Nutzung verwendet, modifiziert und weitergegeben werden.

Die unter [`licenses/raw/`](licenses/raw/) archivierten Lizenztexte Dritter bleiben Eigentum
der jeweiligen Rechteinhaber und sind ausschließlich zu Dokumentations- und Analysezwecken in
ihrer Originalfassung mitgeführt. Sie sind nicht Teil der MIT-Freigabe.
