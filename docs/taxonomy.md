# Lizenz-Taxonomie und Compliance-Flags

Dieses Dokument hält die Datenmodell-Entscheidungen fest: welche Lizenz-Kategorien verwendet werden, warum sie so geschnitten sind und welche zusätzlichen Compliance-Dimensionen jenseits der reinen Lizenz erfasst werden.

Referenz im Code: [`lib/types.ts`](../lib/types.ts).

## 1. Warum eine eigene Taxonomie

SPDX ist der Standard für Lizenz-Identifier, liefert aber keine Kategorisierung, die für die Compliance-Entscheidung ausreicht. Insbesondere fehlt dort:

- die Abgrenzung *Source-Available vs. OSI-approved* (siehe Llama, frühere Gemma-Generationen, Falcon)
- der Umgang mit *Responsible-AI-Klauseln* (OpenRAIL, Use-Based Restrictions)
- *Multi-Tier-Lizenzierung*, bei der ein Anbieter einzelne Modellgrößen oder Varianten unter verschiedene Lizenzen stellt
- Dimensionen *jenseits des Urheberrechts* wie Exportkontrolle oder Jurisdiktion des Herausgebers

Die Taxonomie soll daher nicht SPDX ersetzen, sondern ergänzen.

## 2. Lizenz-Kategorien (`LicenseCategory`)

Acht Kategorien. Die ersten sieben sind die klassische Zerlegung des OSS-Spektrums plus dem "Source-Available"-Graubereich. Die achte ist ein Eltern-Label für Portfolios mit unterschiedlichen Varianten.

### 2.1 `osi-permissive`
MIT, Apache-2.0, BSD-2/3, ISC, Boost. Keine Copyleft-Verpflichtung, minimale Attribution. Apache-2.0 hat zusätzlich einen expliziten Patent-Grant.

### 2.2 `osi-weak-copyleft`
LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0. File- oder Library-Level-Copyleft; Linken aus proprietärem Code ist in der Regel möglich.

### 2.3 `osi-strong-copyleft`
GPL-2.0, GPL-3.0, AGPL-3.0. Projekt-Level-Copyleft. AGPL hat zusätzlich die Netzwerk-Klausel.

### 2.4 `public-domain`
CC0-1.0, Unlicense. Die Wirksamkeit einer Public-Domain-Dedication ist in einigen Jurisdiktionen umstritten.

### 2.5 `source-available-restricted`
Llama 4 Community License, Gemma Terms, Stable Diffusion 3.5 Community, Falcon 180B License. Gewichte und/oder Code sind einsehbar, aber mit Restriktionen wie MAU-Schwellen, Use-Based Restrictions oder Revenue-Gates. Keine OSS-Lizenzen im Sinne der OSI.

### 2.6 `research-only`
Mistral Research License (MRL-0.1) und ähnliche Klauseln. Kommerzielle Nutzung ist ausgeschlossen; Separatlizenz beim Anbieter erforderlich.

### 2.7 `proprietary-api-only`
FLUX.1 pro, GPT-4, Claude API. Kein Lizenztext für Weights, Zugang ausschließlich über kommerzielle API mit Terms of Service.

### 2.8 `multi-tier-licensing`
Ein Anbieter stellt mehrere Varianten eines Modells oder Portfolios unter unterschiedlichen Lizenzen. Die konkret zutreffende Kategorie hängt von der gewählten Variante ab.

Typische Fälle:

- **FLUX.1 (Black Forest Labs):** schnell unter Apache-2.0, dev unter Non-Commercial, pro rein API/Proprietary
- **Mistral-Portfolio:** offene Linien wie Mistral Small 4 und Mistral Large 3 unter Apache-2.0, daneben Sonderfälle wie Devstral 2 mit modified MIT
- **Kimi K2 (Moonshot AI):** modified MIT mit schwellenabhängiger Attribution- und Branding-Pflicht

Das Tool behandelt `multi-tier-licensing` in der Kompatibilitätsmatrix nicht direkt, sondern löst auf die konkrete Variante auf. In der Modell-Registry (`lib/models.json`) wird daher pro Modellvariante ein eigener Eintrag mit separatem `license_id` geführt.

## 3. Compliance-Flags (`additional_compliance_flags`)

Rein lizenzrechtliche Kategorien reichen nicht aus, sobald Modelle aus Jurisdiktionen kommen, die regulatorisch gesondert behandelt werden, oder wenn Exportkontrollrecht eingreift.

Beispiele:

- Z.ai bzw. Zhipu AI steht seit Januar 2025 auf der US Entity List. Die Lizenz kann trotzdem permissiv sein; für US-basierte Unternehmen ist zusätzlich EAR-Compliance zu prüfen.
- DeepSeek und Qwen sitzen in `CN`; unabhängig von der konkreten Lizenz können dadurch weitere Datenschutz- oder Dokumentationspflichten relevant werden.
- Trainings-Hardware-Herkunft ist keine Pflichtangabe, aber für Lieferketten-Analysen relevant.

Das Feld `additional_compliance_flags` ist im Datenmodell optional am `License`-Typ angehängt.

```ts
interface AdditionalComplianceFlags {
  entity_list_status: EntityListStatus;
  training_hardware_origin: HardwareOrigin;
  publisher_jurisdiction: string;
}
```

### 3.1 `entity_list_status`

Enum:

- `none`
- `US_Entity_List`
- `US_SDN`
- `EU_Sanctions`
- `unknown`

### 3.2 `training_hardware_origin`

Enum:

- `unknown`
- `nvidia`
- `huawei-ascend`
- `google-tpu`
- `amd`
- `mixed`

### 3.3 `publisher_jurisdiction`

Freitext, bevorzugt als ISO-3166-Alpha-2 wie `US`, `FR`, `CN`, `DE`.

## 4. Abbildung auf die aktive LLM-Registry

Die aktive Modell-Registry in `lib/models.json` ist bewusst konservativ und LLM-fokussiert. Bildmodelle und lizenzlich noch uneindeutige Kandidaten bleiben vorerst außerhalb des aktiven Bestands.

| Modell | Lizenz-Kategorie | `entity_list_status` | `publisher_jurisdiction` |
|---|---|---|---|
| Llama 4 Maverick | source-available-restricted | none | US |
| Gemma 4 31B | osi-permissive (Apache) | none | US |
| Qwen3-235B-A22B | osi-permissive (Apache) | none | CN |
| Qwen3-Coder-480B-A35B-Instruct | osi-permissive (Apache) | none | CN |
| DeepSeek-V3.2 | osi-permissive (MIT) | none | CN |
| Phi-4-reasoning-plus | osi-permissive (MIT) | none | US |
| Mistral Small 4 | osi-permissive (Apache) | none | FR |
| Mistral Large 3 | osi-permissive (Apache) | none | FR |
| OLMo 3.1 32B Instruct | osi-permissive (Apache) | none | US |
| Kimi-K2-Instruct-0905 | multi-tier-licensing | none | CN |

Die Compliance-Flags sind ausdrücklich nicht Bestandteil der Lizenz-Kompatibilitätsmatrix. Sie erscheinen in der Tool-Ausgabe als zusätzliche Hinweis-Zeile.

## 5. Offene Punkte

- Wenn GLM-5 oder GLM-5.1 später in die aktive Registry aufgenommen werden sollen, muss die MIT-vs.-Apache-Diskrepanz zwischen Hugging Face und GitHub zuerst sauber aufgelöst werden.
- Bildmodelle wie FLUX.1 oder Stable Diffusion 3.5 sind nicht Teil der aktiven LLM-Registry und sollten bei Bedarf in eine getrennte Modell-Registry ausgelagert werden.
- Für modified-MIT-Fälle wie Devstral 2 wäre langfristig eine eigene `license_id` sinnvoll, statt sie informell unter `multi-tier-licensing` oder `mit` einzuordnen.
- Für `entity_list_status` könnte langfristig ein täglicher Cron gegen die BIS-Liste laufen. Für dieses Portfolio-Projekt wird manuell kuratiert und der Stand in `notes` dokumentiert.
