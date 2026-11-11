# ⚓ Wellenpfad – Die SBF-Chroniken

Ein Lern-Rollenspiel (HTML5, läuft im Handy-Browser) für die **amtlichen Prüfungsfragen zum Sportbootführerschein Binnen & See**.
Jede Attacke gelingt nur, wenn du die Prüfungsfrage richtig beantwortest – so wird jeder Kampf zur Lerneinheit.

## Starten

**Online spielen:** Das Spiel ist eine reine statische Seite ohne Build-Schritt. In GitHub unter
Settings → Pages → *Deploy from a branch* den Branch `main` mit Ordner `/ (root)` wählen – fertig.
(`.nojekyll` sorgt dafür, dass GitHub die Dateien unverändert ausliefert.)

**Lokal:** Keine Installation, kein Build. Einfach den Ordner über einen Webserver ausliefern, z. B.:

```sh
python3 -m http.server 8000
# dann http://localhost:8000 im Browser öffnen (auch vom Handy im gleichen WLAN)
```

Auf jedem statischen Hosting funktioniert es genauso. Über HTTPS ist das Spiel als
**PWA installierbar und offline spielbar** (Service Worker).

## Inhalte

- **513 amtliche Multiple-Choice-Fragen** (ELWIS-Kataloge, gültig seit 01.08.2023) inkl. 147 Abbildungen:
  72 Basisfragen, 181 Binnen, 213 See, 47 Segeln Binnen. Modi: *SBF Binnen*, *SBF See*, *Binnen + See*, optional Segeln.
- **Lernkartei nach Leitner** (Fächer 0–5): falsch beantwortete Fragen kommen häufiger, sichere seltener.
- **Prüfungssimulation** wie im Original: 30 Fragen (7 Basis + 23 spezifisch), bestanden ab 24 richtigen, Auswertung am Ende.
- **Statistik**: Trefferquote, Serien, Leitner-Verteilung, Fortschritt je Bereich, 14-Tage-Aktivität, Prüfungshistorie, Top-10-Problemfragen.
- **Fragenkatalog** mit Suche & Filtern (Problemfragen, ungesehen, sicher) und Training (Schnelltraining, Problemfragen, neue Fragen).

## Spiel

- Pixel-Art im **2.5D-Stil**: mehrere Ebenen mit Tiefenunschärfe, Bloom, Lichtstrahlen, Wasserspiegelungen, Tageszeiten & Wetter.
- **Partykampf auf dem Wasser** gegen Flussmonster: Schilde & Schwächen (BREAK), Boost-Punkte, Fähigkeiten, Abwehrfragen bei Gewaltangriffen,
  Tempo-Bonus für schnelle Antworten und Lernserien-Bonus.
- **7 spielbare Helden** (Originalfiguren nach bekannten Archetypen: Klingen-Kapitän, Elfen-Bogenschütze, Feuerfaust-Pirat,
  Monsterjäger, Revolverklinge, Ronin, Dämonenjäger), 4 davon aktiv.
- Weltkarte mit 9 Orten von Ankerstadt bis zur Leuchtturmklippe, 3 Bosse, Häfen mit Gasthaus, Händler, Werft (Upgrades), Taverne (Crew) und Prüfungsamt.
- **3 Speicherstände** (localStorage, Autosave) + Export/Import als JSON-Datei.
- Chiptune-Musik & Soundeffekte per WebAudio (synthetisch, keine Audiodateien).

## Weitere Funktionen

- **Charakter-Editor:** Frisur, Gesicht, Hautton, Oberkörper, Körperbau, Hose und Schuhe frei kombinierbar; Namen frei wählbar.
- **Crew-Reaktionen:** Der Kapitän schimpft bei falschen Antworten, die übrige Crew lobt bei richtigen – oder eigene Sprüche (Platzhalter `{name}`, `{n}`).
- **Realmodus:** Keine Pixelgrafik – eigene Fotos für die Crew und eigene Bilder für richtige/falsche Antworten (bleiben lokal im Browser).

## Datenschutz

Das Spiel hat kein Backend, keine Konten, kein Tracking und lädt nichts von fremden Servern.
Spielstände, Fotos und Texte bleiben ausschließlich im `localStorage` des eigenen Browsers.

## Struktur

```
index.html, css/style.css
js/questions.js   generierte Fragendaten (tools/build_questions.py)
js/gfx.js         Pixel-Renderer, Himmel/Wasser/Schiff, Ebenen
js/sprites.js     Helden-Sprites & prozedurale Monster
js/data.js        Helden, Fähigkeiten, Monster, Items, Karte, Story
js/save.js        Spielstände, Leitner-Lernkartei, Statistik
js/battle.js      Kampfsystem
js/quiz.js        Quiz-Karte
js/main.js        Bildschirme, Karte, Häfen, Lernen, Statistik
js/real.js        Realmodus, eigene Bilder & Reaktionstexte
```

## Quelle der Fragen

Amtliche Fragenkataloge für die Sportbootführerscheine Binnen und See, bereitgestellt vom Bundesministerium für Digitales
und Verkehr auf [ELWIS](https://www.elwis.de) (amtliche Werke). Aufbereitung als JSON über das Projekt
[IAL32/sbf-see-binnen-fragenkataloge](https://github.com/IAL32/sbf-see-binnen-fragenkataloge); übernommen wurden nur die
deutschen amtlichen Texte. Die Abbildungen sind die originalen ELWIS-Grafiken aus
[koljabohne/fragenkatalog_sportbootfuehrerschein](https://github.com/koljabohne/fragenkatalog_sportbootfuehrerschein)
und [deveth0/FuehrerscheinApp](https://github.com/deveth0/FuehrerscheinApp), zugeordnet und geprüft mit
`tools/repair_images.py` (Fragetext-Abgleich, Integritätsprüfung aller GIF-Frames). Für die echte Prüfung bitte immer
den aktuellen Katalog auf ELWIS prüfen.

## Lizenz

Code: MIT (siehe `LICENSE`). Prüfungsfragen und Abbildungen sind amtliche Werke und davon ausgenommen.
