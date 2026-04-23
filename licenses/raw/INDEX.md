# License Snapshot Index

Offline-Korpus aller im Tool zitierten Lizenztexte. Die Snapshots sind eingefroren; maßgeblich bleibt für die Rechtsanwendung stets die jeweils aktuelle Fassung beim Rechteinhaber.

**Stand:** 2026-04-23  
**Abrufdatum aller Snapshots (sofern nicht anders angegeben):** 2026-04-23  
**Namenskonvention:** `<urheber>_<kurztitel>_<datum>.<ext>` in kebab-case, ISO-Datum.

---

## A. Basis-Lizenztexte (OSS / etablierte Referenzen)

| Lizenz | Datei | Typ |
|---|---|---|
| MIT License | `osi_mit_2026-04-23.html` | OSI-approved, permissive |
| Apache License 2.0 | `apache_license-2-0_2026-04-23.txt` | OSI-approved, permissive |
| BSD 2-Clause | `osi_bsd-2-clause_2026-04-23.html` | OSI-approved, permissive |
| BSD 3-Clause | `osi_bsd-3-clause_2026-04-23.html` | OSI-approved, permissive |
| ISC License | `osi_isc_2026-04-23.html` | OSI-approved, permissive |
| Boost Software License 1.0 | `boost_bsl-1-0_2026-04-23.txt` | OSI-approved, permissive |
| MPL 2.0 | `mozilla_mpl-2-0_2026-04-23.html` | OSI-approved, weak copyleft |
| EPL 2.0 | `eclipse_epl-2-0_2026-04-23.html` | OSI-approved, weak copyleft |
| LGPL 2.1 | `fsf_lgpl-2-1_2026-04-23.txt` | OSI-approved, weak copyleft |
| LGPL 3.0 | `fsf_lgpl-3-0_2026-04-23.txt` | OSI-approved, weak copyleft |
| GPL 2.0 | `fsf_gpl-2-0_2026-04-23.txt` | OSI-approved, strong copyleft |
| GPL 3.0 | `fsf_gpl-3-0_2026-04-23.txt` | OSI-approved, strong copyleft |
| AGPL 3.0 | `fsf_agpl-3-0_2026-04-23.txt` | OSI-approved, network copyleft |
| CC0 1.0 | `cc_cc0-1-0_2026-04-23.txt` | Public-domain dedication |
| The Unlicense | `unlicense_unlicense_2026-04-23.txt` | Public-domain style |

---

## B. Aktive LLM-Registry (`lib/models.json`)

Die aktive Modell-Registry ist bewusst konservativ und LLM-fokussiert. Bildmodelle und lizenzlich noch uneindeutige Kandidaten bleiben als Snapshot-Referenzen erhalten, sind aber nicht Teil des aktiven Kernbestands.

Die Spalte *Lizenz-Snapshot* zeigt den kanonischen Lizenztext. Die Spalte *Vendor-Beleg* verweist auf das Release-Artefakt, mit dem der Hersteller den Einsatz dieser Lizenz für die konkrete Modellversion dokumentiert. Bei Modellen ohne eigene `LICENSE`-Datei im HF-Repo dient die README mit ihrem YAML-Frontmatter (`license: apache-2.0`) als Vendor-Beleg; wo der Hersteller selbst eine Lizenzdatei ausliefert, ist Snapshot und Beleg identisch.

| Modell | Lizenz-Snapshot | Vendor-Beleg | Kommentar |
|---|---|---|---|
| Llama 4 Maverick | `meta_llama-4-community-license_2026-04-23.txt` | identisch | Source-available-Referenzfall mit MAU-Schwelle und AUP |
| Gemma 4 31B | `apache_license-2-0_2026-04-23.txt` | `google_gemma-4-31b-it-readme_2026-04-23.md` | Deklaration im README-YAML, zusätzlich Google-eigener License-Link |
| Qwen3-235B-A22B | `alibaba_qwen3-apache_2026-04-23.txt` | identisch | Apache-Text direkt aus dem Qwen-Repo |
| Qwen3-Coder-480B-A35B-Instruct | `alibaba_qwen3-coder-480b-license_2026-04-23.txt` | identisch | Apache-Text direkt aus dem Qwen-Coder-Repo |
| DeepSeek-V3.2 | `deepseek_v3-2-license_2026-04-23.txt` | identisch | MIT-Variante direkt aus dem DeepSeek-Repo |
| Phi-4-reasoning-plus | `microsoft_phi-4-license_2026-04-23.txt` | identisch | MIT direkt aus dem Microsoft-Repo |
| Mistral Small 4 | `apache_license-2-0_2026-04-23.txt` | `mistral_mistral-small-4-readme_2026-04-23.md` | Deklaration im README-YAML |
| Mistral Large 3 | `apache_license-2-0_2026-04-23.txt` | `mistral_mistral-large-3-readme_2026-04-23.md` | Deklaration im README-YAML |
| OLMo 3.1 32B Instruct | `apache_license-2-0_2026-04-23.txt` | `allenai_olmo-3-1-32b-instruct-readme_2026-04-23.md` | Deklaration im README-YAML |
| Kimi-K2-Instruct-0905 | `moonshot_kimi-k2-modified-mit_2026-04-23.txt` | identisch | Modified-MIT direkt aus dem Moonshot-Repo |

---

## C. Weitere Modell- und Policy-Snapshots im Korpus

Diese Dateien bleiben erhalten, obwohl sie nicht alle Teil der aktiven LLM-Registry sind. Sie dienen als Referenz für ältere Lizenzregime, Bildmodelle, Policies oder Versions-Diffs.

| Datei | Zweck |
|---|---|
| `meta_llama-4-acceptable-use-policy_2026-04-23.txt` | Verbindliche AUP für Llama 4 |
| `google_gemma-terms_2026-04-23.html` | Früherer Gemma-Terms-Fall vor Gemma 4 Apache-2.0 |
| `google_gemma-prohibited-use-policy_2026-04-23.html` | Zusätzliche Policy zu den Gemma Terms |
| `mistral_mrl-0-1_2026-04-23.md` | Research-only-Regime; wichtig als Gegenbeispiel zu offenem Apache-Mistral |
| `mistral_research-license_2026-04-23.html` | Älterer Mistral-Research-Snapshot |
| `zai_glm-4-6-apache-2-0_2026-04-23.txt` | Früherer GLM-Lizenzfall; aktiver GLM-Scope bleibt wegen Quellenkonflikt offen |
| `bfl_flux-1-dev-non-commercial-license_2026-04-23.md` | Non-commercial Bildmodell-Fall |
| `bfl_flux-1-schnell-apache_2026-04-23.txt` | Apache-Bildmodell-Fall |
| `stability_sd-3-5-community-license_2026-04-23.md` | Source-available Bildmodell mit Revenue-Gate |
| `bigcode_starcoder2-openrail-m_2026-04-23.html` | OpenRAIL-Beispiel außerhalb des aktiven Kerns |
| `tii_falcon-180b-license_2026-04-23.txt` | Custom source-available Fall außerhalb des aktiven Kerns |
| `alibaba_qwen-research-license_2026-04-23.txt` | Qwen-2.5-Altregime vor Rückkehr zu Apache-2.0 |
| `deepseek_deepseek-v3-model-license_2026-04-23.txt` | DeepSeek-V3-Altregime vor MIT |
| `meta_llama-3-1-community-license_2026-04-23.txt` | Llama-4-Vorgänger |
| `meta_llama-3-3-community-license_2026-04-23.txt` | Llama-4-Vorgänger |
| `microsoft_phi-3-license_2026-04-23.txt` | Phi-4-Vorgänger |

---

## D. Zusammenfassung

- Der aktive Kernbestand in `lib/models.json` umfasst 10 konservativ ausgewählte LLMs.
- Apache-2.0 und MIT decken den Großteil des aktiven Kerns ab; Llama 4 und Kimi K2 bilden die wichtigsten nicht-OSI-fähigen Sonderfälle.
- Für Modelle ohne eigene `LICENSE`-Datei im HF-Repo (Gemma 4, Mistral Small 4, Mistral Large 3, OLMo 3.1) liegt der Vendor-Beleg als README-Snapshot vor; maßgeblich ist darin das YAML-Frontmatter mit der Lizenz-Deklaration.
- Der Snapshot-Korpus bleibt bewusst breiter als die aktive Registry, damit frühere Lizenzregime und Bildmodell-Fälle weiter als Vergleichs- und Audit-Material verfügbar sind.
