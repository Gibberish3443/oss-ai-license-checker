# Kurzgutachten vom 24. April 2026

> Rechtliche Einordnung einzelner Paarungen und Risikoklassen im
> Katalog des `oss-ai-license-checker`. Das Gutachten ist
> projektinterner Arbeitstand, keine Rechtsdienstleistung i.S.d.
> § 2 RDG und ersetzt keine Einzelfallberatung.

Zweck: Die `review_ref`-Felder in
[`lib/compatibility-matrix.json`](../../lib/compatibility-matrix.json)
und die aktualisierten Rechtsfragen in
[`lib/training-data-risks.json`](../../lib/training-data-risks.json)
verweisen auf dieses Memo. Ohne diese Datei wären die Refs tot.

Aufbau: Drei Abschnitte (A1, A2, A3) dokumentieren die
Entscheidungen, die im Zuge dieses Reviews in den Katalog
eingeflossen sind. Ein Ausblick skizziert die noch offene Stufe D.

---

## <a id="a1"></a>A1 — Llama 4 Community License × GPL-3.0 / AGPL-3.0

### Ausgangsproblem

Die Llama 4 Community License (LCL) verpflichtet Weitergebende u.a.
zur sichtbaren Kennzeichnung „Built with Llama" und zu einem
Namenszusatz bei abgeleiteten Modellen (LCL § 2). Zusätzlich enthält
sie eine Schwelle von 700 Mio. monatlich aktiven Nutzern, oberhalb
derer eine Separatlizenz von Meta einzuholen ist.

Die Frage war, wie diese Verpflichtungen mit den Copyleft-Regimen
GPL-3.0 und AGPL-3.0 zusammenwirken.

### Rechtliche Einordnung

**§ 7 GPL-3.0 (Additional Terms)** verbietet „further restrictions"
auf den vom Programm gewährten Rechten. Zulässig sind nach § 7(b)
ausdrücklich nur bestimmte zusätzliche Bedingungen, u.a.
„Preserving specified reasonable legal notices or author
attributions". Eine aktive **Branding-Pflicht** („Built with Llama"
als sichtbare Kennzeichnung auf Produktoberflächen) geht darüber
hinaus — sie erzeugt Handlungspflichten des Downstream-Nutzers, die
die GPL nicht vorsieht und die deshalb als „further restriction" zu
werten sind.

**§ 13 AGPL-3.0 (Remote Network Interaction)** verschärft das
Problem für SaaS-Szenarien: Wer ein AGPL-3.0-Werk über ein Netzwerk
bereitstellt, muss den korrespondierenden Quelltext anbieten. Wenn
dieser Downstream-Stack das Llama-Modell enthält, geraten die
LCL-Pflichten (Branding, Schwellen-Lizenz) mit § 13 AGPL in
Konflikt, weil der AGPL-Empfänger die Weiterverbreitung ohne
LCL-Bindung erwarten dürfte.

### Szenarien-Differenzierung

Der Katalog bewertet vier Use Cases. Die LCL-Pflichten entfalten
unterschiedliche Wirkung:

| Use Case             | Kombiniertes Werk an Dritte? | Ergebnis                                     |
| -------------------- | ---------------------------- | -------------------------------------------- |
| research-only        | nein (§ 60d-TDM intern)      | compatible (unverändert)                     |
| internal-commercial  | nein (In-House)              | compatible (unverändert)                     |
| saas-external (GPL)  | nein — GPL kennt kein § 13   | conditional (Hinweis auf Vertrieb außerhalb) |
| saas-external (AGPL) | ja (§ 13 AGPL)               | **incompatible**                             |
| redistribution (GPL) | ja                           | **incompatible**                             |
| redistribution (AGPL)| ja                           | **incompatible**                             |

### Umsetzung im Katalog

In [`lib/compatibility-matrix.json`](../../lib/compatibility-matrix.json):

- `llama-4-community × gpl-3-0`: `scenarios.redistribution = "incompatible"`
- `llama-4-community × agpl-3-0`: `scenarios.saas-external = "incompatible"` und `scenarios.redistribution = "incompatible"`

Beide Paare tragen `reviewed_by_user: true`,
`reviewed_on: "2026-04-24"` und verweisen per `review_ref` auf
diesen Abschnitt.

### Offen

Die LCL-Schwelle (700 Mio. MAU) wird im Tool derzeit nicht als
Eingabedimension erfasst. Solange Nutzer unterhalb der Schwelle
arbeiten, bleibt die Paarung in der Sache gleich — die Darstellung
kennt diese Zustandsvariable aber nicht. Siehe Ausblick Stufe D.

---

## <a id="a2"></a>A2 — Kimi K2 Modified MIT × GPL-3.0 / AGPL-3.0

### Ausgangsproblem

Die Kimi K2 Modified-MIT-Lizenz ergänzt die MIT-Klauseln um eine
Branding-Pflicht ab einer Nutzungsschwelle (100 Mio. MAU oder
20 Mio. USD Monatsumsatz). Unterhalb der Schwelle wirkt die Lizenz
praktisch wie MIT. Oberhalb entsteht eine Kennzeichnungspflicht
„Kimi K2".

### Dogmatische Spannung

Anders als die Llama-LCL trifft hier zwei GPL-Regelungen
gleichzeitig:

- **§ 7(b) GPL-3.0** erlaubt ausdrücklich „Preserving specified
  reasonable legal notices or author attributions" — das lässt sich
  als Anker für Attributionspflichten lesen.
- **§ 7 Abs. 1 GPL-3.0** verbietet „further restrictions" — das
  spricht gegen jede Pflicht, die über die GPL hinausgeht.

Die Frage, ob die Kimi-Branding-Pflicht noch unter § 7(b) fällt oder
bereits eine „further restriction" ist, hängt am Umfang: Ein
passiver Hinweis im Code-Kommentar wäre § 7(b)-konform; eine
sichtbare Kennzeichnung auf der Produktoberfläche oberhalb einer
Umsatzschwelle verlässt diesen Rahmen. Die Lizenz lässt offen, wie
die Branding-Pflicht konkret zu erfüllen ist.

### Warum bleibt `conditional`?

Das Tool kennt die Nutzungsschwelle nicht als Eingabedimension
(siehe Stufe D). Ein harter Flip auf `incompatible` würde an eine
Zustandsvariable binden, die der Nutzer nicht sieht und nicht setzen
kann. Ein harter Flip auf `compatible` würde die rechtliche
Unsicherheit unterschlagen.

Die Lösung: Status bleibt `conditional`. Die Begründung wurde
umgeschrieben und artikuliert die § 7(b)/§ 7-Abs-1-Dichotomie
explizit, sodass Nutzer die offene Frage erkennen.

### Umsetzung im Katalog

In [`lib/compatibility-matrix.json`](../../lib/compatibility-matrix.json):

- `kimi-k2-modified-mit × gpl-3-0`: Reasoning präzisiert, Status
  bleibt `conditional`.
- `kimi-k2-modified-mit × agpl-3-0`: analog, mit Zusatzhinweis auf
  § 13 AGPL bei SaaS-Nutzung.

Beide Paare tragen `reviewed_by_user: true`,
`reviewed_on: "2026-04-24"` und verweisen per `review_ref` auf
diesen Abschnitt.

---

## <a id="a3"></a>A3 — LAION-Urteil, § 60d vs. § 44b UrhG

### Ausgangsproblem

Das vorherige Katalog-Eintrag zur Risikoklasse „web-crawl" führte
das LAION-Urteil des LG Hamburg (Urt. v. 27.09.2024 – 310 O 227/23)
als `leading_case` für § 44b UrhG. Diese Zuordnung war dogmatisch
unsauber.

### Die beiden Schranken trennen

§ 44b und § 60d UrhG setzen Art. 4 bzw. Art. 3 der DSM-Richtlinie um
und sind **unterschiedliche Schranken mit unterschiedlichem
Anwendungsbereich**:

| Norm       | Anwendungsbereich           | Opt-out möglich? | Art. DSM-RL |
| ---------- | --------------------------- | ---------------- | ----------- |
| § 60d UrhG | wissenschaftliches TDM      | nein             | Art. 3      |
| § 44b UrhG | kommerzielles / sonstiges   | ja (nutzungsvorbehalt) | Art. 4 |

Die Privilegierung in § 60d ist strenger an nicht-kommerzielle
Forschungseinrichtungen gebunden (§ 60d Abs. 2 UrhG) und kennt
keinen Opt-out. § 44b deckt den kommerziellen Graubereich ab, lässt
aber einen maschinenlesbaren Nutzungsvorbehalt zu.

### Welche Norm hat LAION entschieden?

LAION ist ein Verein, der Trainingsdatensätze für die öffentlich
geförderte KI-Forschung erstellt. Das LG Hamburg hat die
Datensatz-Erstellung als **wissenschaftliches TDM nach § 60d UrhG**
qualifiziert und auf dieser Grundlage entschieden. Die Aussagen zu
§ 44b sind **obiter dicta** und daher persuasiv, aber nicht
bindend für die Frage, ob kommerzielle Crawling-Trainings die
Schranke nutzen können.

### Umsetzung im Katalog

In [`lib/training-data-risks.json`](../../lib/training-data-risks.json):

- `web-crawl` / erste legal_issue: `leading_case` von LAION auf
  `null` gesetzt. Die Beschreibung weist darauf hin, dass LAION nur
  obiter für § 44b Stellung nimmt.
- `laion-pair-datasets`: bisherige einzelne legal_issue in drei
  separate Issues aufgespalten:
  1. **§ 60d UrhG — Wissenschaftliches TDM bei Dataset-Erstellung**
     (`leading_case`: LAION — hier trägt das Urteil).
  2. **§ 44b UrhG — Nachnutzung durch kommerzielle Trainer**
     (`leading_case`: `null` — keine höchstrichterliche Klärung).
  3. **Vermittlungs-/Störerhaftung bei referenzierten Bildquellen**
     (`leading_case`: Getty Images v. Stability AI, UK High Court —
     parallel, nicht deutsch, aber nächste einschlägige Entscheidung).

---

## Ausblick: Stufe D — Nutzungsschwellen als Eingabedimension

Mehrere Lizenzen im Katalog schalten Pflichten erst ab einer
bestimmten Nutzungsschwelle scharf. Das Tool kennt diese Schwellen
derzeit nur als Fließtext in der Lizenz-Anzeige, nicht als
eingebbaren Zustand.

### Bestandsaufnahme

| Modell / Lizenz           | Schwelle                                    | Wirkung bei Überschreiten     |
| ------------------------- | ------------------------------------------- | ----------------------------- |
| Llama 4 Community         | 700 Mio. MAU                                | Separatlizenz-Pflicht (Meta)  |
| Kimi K2 Modified MIT      | 100 Mio. MAU / 20 Mio. USD Monatsumsatz     | Branding-Pflicht              |
| SD 3.5 Community          | 1 Mio. USD Jahresumsatz                     | Enterprise-Lizenz-Pflicht     |
| Gemma Terms (Legacy)      | PUP-getrieben, keine feste Zahl             | Use-Based-Ablehnung möglich   |

### Architektur-Skizze

Nicht freie Zahleneingabe, sondern vier Nutzungsstufen als
Checkboxen / Radiogruppe:

- `usage_tier_0` — rein intern / Hobby
- `usage_tier_1` — kommerziell, unter 1 Mio. USD Jahresumsatz
- `usage_tier_2` — kommerziell, bis 20 Mio. USD Monatsumsatz oder 100 Mio. MAU
- `usage_tier_3` — über den Schwellen der Big-Model-Lizenzen

Jede `LicenseRestriction` bekommt ein Feld
`activates_at?: "usage_tier_1" | "usage_tier_2" | "usage_tier_3"`.
`lib/evaluate.ts` liest den vom Nutzer gewählten Tier, filtert
Restrictions auf „aktiv oberhalb dieser Schwelle" und erzeugt
entsprechende Findings.

Der Vorteil: Paarungen wie Kimi × GPL-3 könnten dann sauber
zwischen „unterhalb Schwelle: compatible" und „oberhalb Schwelle:
incompatible" wechseln, ohne den Nutzer mit numerischen Eingaben zu
überfordern.

### Status

Nicht in diesem Review umgesetzt. Als TODO für einen späteren Block
festgehalten. Kein Code-Change pending.

---

## Ausblick: Matrix-Nachgelagerte Abschnitte verschlanken (Pfad B)

Unterhalb der eigentlichen Kompatibilitätsmatrix folgen mehrere
Info-Blöcke (Konflikte, Hinweise, Trainingsdatenrisiken,
Compliance-Flags). Aktuell werden sie als durchlaufender Fließtext
unterhalb der Matrix ausgegeben. Bei mehreren ausgewählten Modellen
summiert sich das zu einem langen Scroll-Pfad.

### Ziel

Die Detailtiefe erhalten, die Sichtbarkeit aber steuerbar machen:

- **Verschachtelung per `<details>`** — die Blöcke „Konflikte",
  „Hinweise" und „Trainingsdaten" klappen standardmäßig
  zusammengefaltet ein. Geöffnet bleiben sollte nur, was Blocker
  enthält.
- **Textboxen / Cards** — inhaltliche Gruppen in visuell abgegrenzte
  Flächen legen, damit das Auge Ankerpunkte findet.
- **Gruppierung nach Schwere** — zuerst Blocker, dann Conditional,
  dann informelle Hinweise. Innerhalb der Gruppe nach Modell
  sortieren.

### Status

Pfad B in diesem Review nicht umgesetzt. Pfad A (Kosmetik in der
Matrix selbst) wurde vorgezogen.

---

## Ausblick: Regelbasiertes Fazit unter der Matrix (Pfad C)

Die Matrix zeigt einzelne Paar-Bewertungen. Was fehlt, ist eine
verdichtete Gesamteinschätzung pro Szenario: „Für SaaS-Extern ist
diese Kombination tragfähig / nicht tragfähig, weil …".

### Randbedingungen

- **Kein LLM im Checker.** Die Anwendung läuft als statische Seite
  auf GitHub Pages und soll keine Laufzeit-KI einbinden.
- **Transparenz.** Das Fazit muss aus den bereits vorliegenden
  Feldern ableitbar sein, damit Nutzer den Schluss nachvollziehen.

### Skizze eines Regelmechanismus

Keine Regex auf Fließtext, sondern deterministische Regeln über die
strukturierten Felder der Matrix:

- `status === "incompatible"` in ≥1 Paar des aktiven Szenarios
  → Fazit: **nicht tragfähig**, mit Liste der blockierenden Paare.
- Alle Paare `compatible` → Fazit: **tragfähig**, mit Hinweis auf
  Attributionspflichten aus den Lizenzen.
- Mindestens ein `conditional`, kein `incompatible`
  → Fazit: **tragfähig mit Auflagen**, mit Liste der offenen Punkte.

Zusätzlich könnten Textbausteine pro Szenario (research-only,
internal-commercial, saas-external, redistribution) ausgewählt und
per Template befüllt werden. Die Bausteine liegen als Konstanten im
Code, nicht als generierter Output.

### Status

Pfad C in diesem Review nicht umgesetzt. Vorgemerkt als eigener
Block nach Abschluss von Pfad B.
