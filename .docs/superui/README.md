# pro-designer — do czego i jak najlepiej wykorzystać ten skill

`pro-designer` to poradnik generycznych standardów UI/UX wewnątrz pluginu `superui` — ok. 660 linii
referencji w 10 plikach tematycznych (`references/`) plus deterministyczny skrypt kontrastu WCAG AA
(`scripts/check_contrast.py`). Poniżej najlepsze zastosowania i sposób pracy z nim.

## Do czego najlepiej się nadaje

1. **Budowanie nowego UI od zera w projektach bez design systemu.**
   To jego główna nisza: gdy host-projekt nie ma `.superui/design-system/`, guardian się wycofuje,
   a pro-designer daje kompletny "senior baseline" — 60-30-10, type ramp, siatka 4/8px, stany
   komponentów. Efekt: UI nie wygląda jak domyślny bootstrapowy szkic.

2. **Krytyka istniejącego UI.**
   Wklej screenshot lub wskaż komponent i poproś o review — skill ma gotową sekwencję
   (Design pass 1–6) i "Final QA" (squint test, inwentarz stanów, reguła detalu). To tryb, którego
   użytkownicy najczęściej nie znają, a jest bardzo tani: sama analiza, zero kodu.

3. **Powierzchnie konwersyjne** — onboarding, pricing, paywalle, signup.
   `ux-psychology.md` to unikat: evidence-based psychologia konwersji z twardymi regułami
   anty-dark-pattern (żadnej fałszywej pilności, scarcity, wrogich defaultów). Przydatne też jako
   checklist etyczny przy review landing page'y.

4. **Formularze i walidacja** (`forms.md`) oraz **dashboardy SaaS** (`saas-dashboards.md` — KPI
   tiles, chrome aplikacji) — dwa najczęstsze i najczęściej psute typy ekranów.

5. **Deterministyczna bramka dostępności.**
   `check_contrast.py` z exit 1 przy oblanym progu AA — można go użyć nawet poza skillem,
   np. w CI albo do przeglądu palety przed jej przyjęciem.

## Jak go najlepiej wykorzystać

- **Nie trzeba go wywoływać wprost** — CSO w `description:` łapie każde "zbuduj/dodaj/popraw"
  dotyczące UI, w dowolnym języku. Ale jawne wywołanie ma sens dla zadań czysto doradczych:
  "oceń tę paletę", "skrytykuj ten ekran", "zaproponuj type ramp" — tam trigger bywa słabszy,
  bo nie ma słowa "build".

- **Zadawaj pytania punktowe przez routing referencji.**
  Skill nie ładuje wszystkich referencji naraz — SKILL.md kieruje do jednego pliku na temat
  (kolor, typografia, mobile, proces/handoff). Pytanie "jak zaprojektować bottom navigation"
  kosztuje tylko `mobile.md`.

- **W parze z guardianem, nie zamiast niego.**
  W projekcie z wyekstrahowanym design systemem pro-designer sam ustępuje (sekcja
  "Design-system precedence") — generyczne absoluty przechodzą przez tokeny systemu. Czyli:
  extractor → konkretne tokeny, guardian → wierność im, pro-designer → zasady tam, gdzie system
  milczy (np. psychologia flow, stany, dostępność). Te trzy warstwy się nie gryzą.

- **Używaj go na etapie planu, nie tylko implementacji.**
  Sekcja "Design pass — apply in this order" (layout → hierarchia → kolor → stany → psychologia
  → QA) działa świetnie jako szkielet spec/planu UI zanim powstanie kod — wtedy non-negotiables
  (jeden CTA, 3 stany async, touch targets 44–48px) trafiają do wymagań zamiast do poprawek.

## W skrócie

Największa dźwignia to (a) automatyczny baseline jakości przy każdym kodzie UI w projektach bez
design systemu i (b) jawnie wywoływany tryb krytyki/audytu istniejących ekranów — plus twardy
skrypt kontrastu jako jedyny nie-uznaniowy element całego pakietu.
