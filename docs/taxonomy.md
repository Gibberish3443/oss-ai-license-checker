# Lizenz-Taxonomie und Compliance-Flags

Dieses Dokument hält die Datenmodell-Entscheidungen fest: welche Lizenz-Kategorien ich verwende, warum sie so geschnitten sind und welche zusätzlichen Compliance-Dimensionen ich jenseits der reinen Lizenz erfasse.

Referenz im Code: [`lib/types.ts`](../lib/types.ts).

## 1. Warum eine eigene Taxonomie

SPDX ist der Standard für Lizenz-Identifier, liefert aber keine Kategorisierung, die für die Compliance-Entscheidung ausreicht. Insbesondere fehlt dort:

- die Abgrenzung *Source-Available vs. OSI-approved* (siehe Llama, Gemma, Falcon)
- der Umgang mit *Responsible-AI-Klauseln* (OpenRAIL, Use-Based Restrictions)
- *Multi-Tier-Lizenzierung*, bei der ein Anbieter einzelne Modellgrößen oder Varianten unter verschiedene Lizenzen stellt (FLUX, Mistral-Portfolio)
- Dimensionen *jenseits des Urheberrechts* — Exportkontrolle, Jurisdiktion des Herausgebers

Die Taxonomie soll daher nicht SPDX ersetzen (das `spdx_identifier`-Feld bleibt erhalten), sondern ergänzen.

## 2. Lizenz-Kategorien (`LicenseCategory`)

Acht Kategorien. Die ersten sieben sind die klassische Zerlegung des OSS-Spektrums plus dem "Source-Available"-Graubereich. Die achte ist neu.

### 2.1 `osi-permissive`
MIT, Apache-2.0, BSD-2/3, ISC, Boost. Keine Copyleft-Verpflichtung, minimale Attribution. Apache-2.0 zusätzlich mit Patent-Grant.

### 2.2 `osi-weak-copyleft`
LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0. File- oder Library-Level-Copyleft; Linken aus proprietärem Code i.d.R. möglich.

### 2.3 `osi-strong-copyleft`
GPL-2.0, GPL-3.0, AGPL-3.0. Projekt-Level-Copyleft. AGPL zusätzlich mit Netzwerk-Klausel (§13), die für SaaS-Szenarien entscheidend ist.

### 2.4 `public-domain`
CC0-1.0, Unlicense. Rechtliche Wirksamkeit einer Public-Domain-Dedication ist in einigen Jurisdiktionen (u.a. Deutschland) umstritten — das ist ein eigener Hinweis in `restrictions`.

### 2.5 `source-available-restricted`
Llama 4 Community License, Gemma Terms, Stable Diffusion 3.5 Community, Falcon 180B License. Code und/oder Gewichte einsehbar, aber mit einer oder mehreren Restriktionen: MAU-Schwelle, Use-Based Restrictions, Feld-Verbote, Jurisdiktionsauflagen. Keine OSS-Lizenz im Sinne der OSI.

### 2.6 `research-only`
Mistral Research License (MRL-0.1), ältere "research-only"-Clauses. Kommerzielle Nutzung ausdrücklich ausgeschlossen; Separatlizenz beim Anbieter erforderlich.

### 2.7 `proprietary-api-only`
FLUX.1 pro, GPT-4, Claude API. Kein Lizenztext für Weights, Zugang ausschließlich über kommerzielle API mit Terms of Service. Für das Tool bedeutet das: keine Kompatibilitätsprüfung gegen Code-Lizenzen im klassischen Sinne; stattdessen nur Nutzungsbedingungen des API-Betreibers.

### 2.8 `multi-tier-licensing` (neu)

Ein Anbieter stellt mehrere Varianten eines Modells (oder eines Portfolios) unter *unterschiedliche* Lizenzen. Die Kategorisierung dient als **Eltern-Label**; die konkret zutreffende Kategorie hängt von der gewählten Variante ab.

Typische Fälle:

- **FLUX.1 (Black Forest Labs):** schnell unter Apache-2.0, dev unter Non-Commercial, pro rein API/Proprietary.
- **Mistral-Portfolio:** Mistral 7B / Small 3.1 unter Apache, Mistral Large 3 unter MRL-0.1, darüber hinaus kommerzielle Separatverträge.
- **Kimi K2 (Moonshot AI):** "Modified MIT" mit schwellenabhängiger Attribution-/Branding-Pflicht — die Lizenzwirkung wechselt faktisch ab einer Nutzerzahl.

Das Tool behandelt `multi-tier-licensing` in der Kompatibilitätsmatrix **nicht direkt**, sondern löst auf die Variante auf. In der Modell-Registry (`lib/models.json`) wird daher pro Modellvariante ein eigener Eintrag mit separatem `license_id` geführt.

## 3. Compliance-Flags (`additional_compliance_flags`)

Rein lizenzrechtliche Kategorien reichen nicht aus, sobald Modelle aus Jurisdiktionen kommen, die regulatorisch gesondert behandelt werden, oder wenn Exportkontrollrecht eingreift. Beispiele, die mir bei der Kuratierung aufgefallen sind:

- **Z.ai / Zhipu AI** (Herausgeber von GLM-4.6) steht seit Januar 2025 auf der US Entity List. Die Lizenz selbst ist Apache-2.0, also unproblematisch. Für US-basierte Unternehmen ist trotzdem zu prüfen, ob der Einsatz gegen EAR-Vorschriften verstößt.
- **DeepSeek** und **Qwen** sind in Jurisdiktionen (CN) ansässig, die unabhängig von der konkreten Lizenz eigene Datenschutz- und Trainings-Dokumentationspflichten auslösen können (Cyberspace Administration of China, Algorithm Recommendation Rules).
- **Trainings-Hardware-Herkunft** ist keine Pflichtangabe, aber in Lieferketten-Analysen relevant (z.B. Huawei Ascend bei einigen chinesischen Modellen).

Das Feld `additional_compliance_flags` ist daher **optional am `License`-Typ** (nicht am Modell), weil es sich typischerweise mit dem Lizenzgeber/Herausgeber verbindet. Drei Unter-Felder:

```ts
interface AdditionalComplianceFlags {
  entity_list_status: EntityListStatus;
  training_hardware_origin: HardwareOrigin;
  publisher_jurisdiction: string;
}
```

### 3.1 `entity_list_status`

Enum. Abgebildet werden nur dokumentierbare Listungen, keine Mutmaßungen:

- `none` — keine bekannte Listung
- `US_Entity_List` — BIS Entity List (15 CFR § 744)
- `US_SDN` — OFAC Specially Designated Nationals
- `EU_Sanctions` — EU-Sanktionslisten (Ratsverordnungen)
- `unknown` — nicht recherchiert / unklar

Erweiterung möglich (z.B. UK, JP), aber bewusst schmal gehalten, um nicht vorzutäuschen, alle Sanktionsregimes abzudecken.

### 3.2 `training_hardware_origin`

Enum:

- `unknown` (Default für Modelle ohne öffentliche Hardware-Angabe)
- `nvidia` (westliche Training-Cluster)
- `huawei-ascend`
- `google-tpu`
- `amd`
- `mixed`

Der Wert basiert auf öffentlichen Aussagen des Anbieters (Model Card, Paper, Pressemitteilung). Wenn keine Angabe vorliegt, bleibt es `unknown` — ich halluziniere keine Hardware-Zuordnung.

### 3.3 `publisher_jurisdiction`

Freitext (ISO-3166-Alpha-2 bevorzugt: `US`, `FR`, `CN`, `AE`, `DE`). Jurisdiktion des vertraglich bindenden Rechteinhabers, nicht des Entwicklungsteams. Beispiel: Mistral AI SAS → `FR`; Meta Platforms, Inc. → `US`; Z.ai → `CN`; TII → `AE`.

## 4. Abbildung auf die aktuellen Modelle

| Modell | Lizenz-Kategorie | `entity_list_status` | `publisher_jurisdiction` |
|---|---|---|---|
| Llama 4 | source-available-restricted | none | US |
| Mistral Large 3 | research-only | none | FR |
| Mistral 7B | osi-permissive (Apache) | none | FR |
| Gemma 3 | source-available-restricted | none | US |
| Qwen3 | osi-permissive (Apache) | none | CN |
| DeepSeek V3.2 | osi-permissive (MIT) | none | CN |
| Phi-4 | osi-permissive (MIT) | none | US |
| GLM-4.6 | osi-permissive (Apache) | **US_Entity_List** | CN |
| FLUX.1 | multi-tier-licensing | none | DE |
| Stable Diffusion 3.5 | source-available-restricted | none | UK |
| Kimi K2 | multi-tier-licensing | none | CN |

Die Compliance-Flags sind ausdrücklich **nicht** Bestandteil der Lizenz-Kompatibilitätsmatrix. Sie erscheinen in der Tool-Ausgabe als zusätzliche Hinweis-Zeile, etwa "Herausgeber steht auf der US Entity List — unabhängig von der Lizenz Exportkontrolle prüfen".

## 5. Offene Punkte

- FLUX.1 als `multi-tier-licensing` erfordert drei Unterzeilen in der Modell-Registry (dev / schnell / pro), von denen pro und dev unterschiedlich bewertet werden. Umsetzung in Block 3.
- Kimi K2 wurde vom Recherche-Agenten vorgeschlagen und ist Teil der Datenlage, aber die Aufnahme in den finalen Scope steht unter G3-Review.
- Für `entity_list_status` könnte langfristig ein täglicher Cron gegen die BIS-Liste laufen. Für dieses Portfolio-Projekt wird manuell kuratiert und der Stand in `notes` dokumentiert.
