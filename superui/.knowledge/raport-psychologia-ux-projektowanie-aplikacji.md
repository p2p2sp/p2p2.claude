# Raport: Psychologia UX w projektowaniu aplikacji

**Cel dokumentu:** baza wiedzy / kontekst do stworzenia skilla wspierającego projektowanie
onboardingu, formularzy, ekranów upgrade, pricingu i flow konwersji.
**Źródło pierwotne:** film „The UX Psychology Behind Apps People Can't Stop Using" (kanał UX Peak, YouTube).
**Uwaga metodologiczna:** transkrypcji nie udało się pobrać bezpośrednio (YouTube zwrócił błąd 429).
Raport zbudowano na podstawie streszczenia filmu oraz weryfikacji każdej zasady w niezależnych,
wiarygodnych źródłach UX (patrz sekcja *Źródła*). Przykłady w filmie dotyczą mobile, ale zasady
są uniwersalne — dotyczą również web/SaaS/desktop. Różnice platformowe zaznaczono osobno.

---

## Teza główna

Aplikacje rzadko upadają dlatego, że UI jest brzydki. Upadają, bo projekt ignoruje sposób,
w jaki ludzie **faktycznie podejmują decyzje**. Ten sam ekran można zaprojektować tak, by kolejny
krok wydawał się oczywisty i wart wykonania — albo tak, by wydawał się trudny i łatwy do porzucenia.

**Rdzeń dobrego UX:** sprawić, by następna akcja użytkownika była *oczywista, wartościowa i warta dokończenia*.
To nie jest kwestia estetyki, tylko redukcji tarcia poznawczego i właściwego framingu decyzji.

Kilka obserwacji wyjściowych, które napędzają cały raport:
- Pusty formularz wydaje się trudniejszy niż wypełniony wstępnie.
- 0% postępu boli bardziej niż 20%.
- Ściana logowania (signup wall) boli bardziej niż otrzymanie wartości najpierw.
- Ta sama cena wydaje się droga lub tania zależnie od tego, co użytkownik zobaczył chwilę wcześniej.

---

## 6 zasad psychologicznych

Każda zasada zawiera: nazwę psychologiczną, mechanizm, kontrast *przed/po*, zastosowanie na
mobile i web, konkretną regułę projektową oraz pułapki i granice etyczne.

### 1. Smart Defaults — inteligentne wartości domyślne zamiast pustych pól

**Nazwa psychologiczna:** *default effect / status quo bias*, redukcja *cognitive load*, prawo Hicka
(im więcej i im bardziej otwartych wyborów, tym dłuższa i trudniejsza decyzja).

**Mechanizm:** pusty formularz zmusza użytkownika do wygenerowania odpowiedzi od zera — to wysiłek
poznawczy, który prowadzi do *decision fatigue* i porzuceń. Sensowna wartość domyślna zamienia
zadanie „wymyśl odpowiedź" na dużo łatwiejsze „zaakceptuj lub popraw".

**Przed → Po:**
- Przed: puste pola, otwarte pytania, 20 opcji do wyboru.
- Po: pola wypełnione rozsądnym domyślnym wyborem, ograniczona liczba opcji, pytania zamknięte.

**Zastosowanie:**
- Mobile: predefiniowane opcje jako duże, gotowe do dotknięcia „chipy"/przyciski; unikanie
  ręcznego wpisywania tam, gdzie wybór wystarczy.
- Web/SaaS: wstępne wypełnianie na podstawie znanych danych (kraj z IP, plan „polecany" zaznaczony,
  częstotliwość rozliczenia ustawiona na najczęściej wybieraną).

**Reguła projektowa:** *Bądź preskryptywny.* Nie pytaj o 20 rzeczy, gdy wystarczy 5. Zamień otwarte
pola na ograniczony, sensownie ustawiony zestaw wyborów. Każdy zabrany wybór to niższy koszt interakcji.

**Etyka / pułapki:** wartość domyślna nie może być pułapką (np. domyślnie zaznaczona droższa opcja,
zgody marketingowe, auto-odnowienie ukryte pod defaultem). Default ma służyć użytkownikowi, nie
podbijać metrykę kosztem jego interesu.

---

### 2. Endowed Progress — onboarding nigdy nie zaczyna się od 0%

**Nazwa psychologiczna:** *endowed progress effect* (Nunes & Drèze) oraz *goal gradient effect*
(im bliżej celu, tym silniejsza motywacja, by go dokończyć).

**Mechanizm:** kiedy pasek postępu startuje np. od 20–30% zamiast od zera, użytkownik czuje, że
„już coś ma" i nie zaczyna od pustki. To znacząco obniża porzucenia. Kluczowe: liczy się nawet
*iluzja* postępu — mózg reaguje na wrażenie zbliżania się do celu.

**Przed → Po:**
- Przed: pasek startuje od 0%, użytkownik ma poczucie długiej drogi przed sobą.
- Po: pasek startuje od wartości > 0% (np. po utworzeniu konta / potwierdzeniu maila pokazujesz „30% ukończone").

**Zastosowanie:**
- Mobile: krótkie flow 3–5 ekranów z widocznym paskiem/krokami „2 z 4"; auto-zapis postępu.
- Web/SaaS: onboardingowe checklisty z jednym zadaniem już odhaczonym; wieloetapowe formularze
  z wyraźnym wskaźnikiem postępu i możliwością zapisu draftu.

**Reguła projektowa:** pokazuj postęp od pierwszego kroku i przypisz użytkownikowi „na starcie"
część drogi jako już wykonaną (np. za sam fakt założenia konta).

**Etyka / pułapki:** postęp musi być prawdziwy. „Przypisany" start (np. „krok rejestracji zaliczony")
jest w porządku, bo odzwierciedla realnie wykonaną czynność. Fałszywy pasek, który nie odpowiada
żadnej akcji, to dark pattern.

---

### 3. Zeigarnik Effect — niedokończone zadania trzymają uwagę

**Nazwa psychologiczna:** *Zeigarnik effect* (Bluma Zeigarnik) — niedokończone lub przerwane
zadania „wiszą" w pamięci silniej niż zakończone.

**Mechanizm:** widoczny, niedomknięty stan (pasek postępu, checklista z brakującymi krokami,
profil ukończony w 70%) tworzy psychologiczne napięcie, które motywuje do dokończenia. To uzupełnia
się z zasadą 2: pasek nie tylko pokazuje start > 0%, ale też *otwartą lukę do domknięcia*.

**Przed → Po:**
- Przed: brak sygnału, ile zostało; użytkownik nie wie, że coś jest niedokończone.
- Po: „Twój profil jest w 70% gotowy — dokończ 2 kroki", widoczna lista pozostałych zadań.

**Zastosowanie:**
- Mobile: „setup checklist" na ekranie głównym; delikatne przypomnienia push o niedokończonym setupie.
- Web/SaaS: dashboardowe checklisty aktywacji; badge „X/Y ukończone".

**Reguła projektowa:** uczyń niedokończony stan widocznym i konkretnym (ile zostało, co dokładnie),
ale nie natrętnym. Powiąż go z realną wartością dla użytkownika, nie tylko z metryką aktywacji.

**Etyka / pułapki:** nie twórz sztucznych, wiecznie niedomkniętych stanów tylko po to, by generować
niepokój i wymuszać zaangażowanie.

---

### 4. Reciprocity — daj wartość, zanim poprosisz o rejestrację

**Nazwa psychologiczna:** *reciprocity* (Cialdini) + zasada *value before login wall*; badania
pokazują, że ściany logowania masowo zniechęcają, jeśli pojawiają się przed dostarczeniem wartości.

**Mechanizm:** ludzie ważą korzyść względem kosztu (czas, wysiłek, dane). Jeśli najpierw pokażesz
konkretną wartość, budujesz zaufanie i użytkownik chętniej „odwzajemnia" — zakłada konto, płaci,
udostępnia dane. Prośba o zaangażowanie *przed* wartością to najczęstszy powód ucieczki.

**Przed → Po:**
- Przed: „Załóż konto, żeby cokolwiek zobaczyć" na wejściu.
- Po: guest access / tryb demo / od razu widoczny efekt (np. wygenerowany wynik), a prośba o konto
  dopiero po dostarczeniu wartości.

**Zastosowanie:**
- Mobile: pozwól przejść core-flow bez konta; proś o rejestrację przy zapisie/synchronizacji.
- Web/SaaS: „try before signup", interaktywne demo, natychmiastowy rezultat; opóźnij prompt „create account".

**Reguła projektowa:** zawsze demonstruj wartość *przed* wymaganiem czegokolwiek, nie po. Opóźniaj
ścianę logowania do momentu, w którym użytkownik jest już przekonany, że warto.

**Etyka / pułapki:** „wartość najpierw" nie może być przynętą, po której realna funkcja jest zablokowana
w sposób ukryty (bait-and-switch). Obietnica musi być prawdziwa.

---

### 5. IKEA Effect — wysiłek buduje przywiązanie

**Nazwa psychologiczna:** *IKEA effect* (Norton, Mochon, Ariely) — cenimy bardziej to, w co
sami włożyliśmy pracę.

**Mechanizm:** kiedy użytkownik personalizuje produkt, konfiguruje przestrzeń, dodaje własne dane
czy „buduje" swój setup, rośnie jego poczucie własności i przywiązanie. To zwiększa retencję i
obniża skłonność do porzucenia — porzucenie oznacza utratę własnej pracy.

**Przed → Po:**
- Przed: gotowy, generyczny produkt bez udziału użytkownika.
- Po: onboarding, w którym użytkownik konfiguruje profil/workspace/preferencje i widzi, że jego
  wybory realnie zmieniają produkt.

**Zastosowanie:**
- Mobile: personalizacja treści/celów podczas onboardingu (np. wybór celów zmienia rekomendacje).
- Web/SaaS: kreator workspace'u, import danych, ustawienie własnego szablonu/theme'u.

**Reguła projektowa:** daj użytkownikowi wnieść *lekki, sensowny wkład* wcześnie — ale tylko taki,
który realnie wpływa na dalsze doświadczenie. Personalizacja bez konsekwencji (pytania, które
niczego nie zmieniają) to „empty personalization" i strata uwagi.

**Etyka / pułapki:** nie zmuszaj do nadmiernej pracy tylko po to, by zwiększyć przywiązanie.
Wkład ma dawać użytkownikowi realną wartość (lepsze dopasowanie), nie tylko „uwięzić" go w produkcie.

---

### 6. Loss Aversion + Anchoring — framing straty i kontrast ceny

**Nazwy psychologiczne:** *loss aversion* / *prospect theory* (Kahneman & Tversky) — strata boli
mocniej niż równoważny zysk cieszy; oraz *anchoring* i *framing effect* — pierwsza/sąsiadująca
liczba ustawia punkt odniesienia dla oceny ceny.

**Mechanizm (dwie powiązane dźwignie):**
- *Loss aversion:* komunikat oparty na tym, co użytkownik *straci* (dostęp, dane, zniżkę, postęp),
  działa silniej niż wyliczanka zalet. „Nie trać X" > „zyskaj X" przy tej samej treści.
- *Anchoring / kontrast:* ta sama cena wydaje się droga lub tania w zależności od tego, co pokazano
  tuż przed nią. Wyższy plan obok, przekreślona cena, cena „za dzień" zamiast „za rok" — wszystko
  to zmienia percepcję bez zmiany samej liczby.

**Przed → Po:**
- Przed: ekran upgrade wymienia listę funkcji planu premium.
- Po: pokazujesz, co użytkownik traci zostając na free (framing straty) + ustawiasz kontekst cenowy
  (plan odniesienia / „najpopularniejszy" / rozbicie ceny na mniejszą jednostkę).

**Zastosowanie:**
- Mobile: ekran paywalla z wyraźnym kotwiczeniem (plan roczny obok miesięcznego, „oszczędzasz X%").
- Web/SaaS: tabela planów z wyróżnionym planem-kotwicą; komunikacja utraty dostępu przy końcu triala.

**Reguła projektowa:** przy konwersji framinguj wokół realnej straty i świadomie ustawiaj kontekst
(kotwicę) ceny — ale wyłącznie w oparciu o prawdziwe fakty.

**Etyka / pułapki (najważniejsze w całym raporcie):** to zasada najbliższa dark patterns. Zakazane:
fałszywa pilność, fałszywy niedobór, fałszywe „przekreślone" ceny, sztuczne odliczanie, wprowadzająca
w błąd kotwica. Framing straty jest etyczny tylko wtedy, gdy strata jest realna (np. faktyczna utrata
dostępu po triallu).

---

## Wnioski uniwersalne: mobile vs web

Zasady są takie same, różni się ich implementacja:

- **Cognitive load / krótkie flow:** mobile wymusza jeszcze krótsze kroki (3–5 ekranów, jeden
  koncept na ekran, auto-zapis na wypadek przerwania). Web/desktop znosi więcej naraz (multi-step
  formularze, szersze tabele planów), ale nadal potrzebuje wyraźnego wskaźnika postępu i zapisu draftu.
- **Wielkość i rozmieszczenie celów (prawo Fittsa):** na mobile tap-targety muszą być duże i dobrze
  rozstawione; na web można gęściej, ale kluczowe akcje nadal powinny być duże i widoczne.
- **Kontekst użycia:** mobile = multitasking i przerwania → projektuj re-entry (wróć tam, gdzie
  skończyłeś). Web = użytkownik częściej z konkretnym zadaniem → szanuj jego czas, ale pokaż kluczowe funkcje.
- **Uniwersalna zasada nadrzędna:** *najpierw wartość, potem prośba; najpierw domyślne, potem
  dopytywanie; zawsze widoczny postęp; framing wokół realnej straty; kontekst ceny oparty na prawdzie.*

---

## Granice etyczne (twarde reguły — anti-dark-patterns)

Te zasady mają czynić produkt *jaśniejszym i łatwiejszym*, nie manipulować. Nigdy nie stosuj:

1. Fałszywej pilności (sztuczne timery, „oferta znika za 5 min", gdy nie znika).
2. Fałszywego niedoboru („zostało 2 miejsca", gdy nieprawda).
3. Fałszywego postępu (pasek niepowiązany z realną akcją).
4. Fałszywych wyników, recenzji, social proof.
5. Mylącej kotwicy / fałszywych przekreślonych cen.
6. Defaultów działających przeciw użytkownikowi (ukryte zgody, ukryte auto-odnowienie).
7. Wymuszania nadmiernej pracy tylko po to, by „uwięzić" (nadużycie IKEA effect).

**Test etyczny:** jeśli technika działa tylko dlatego, że użytkownik czegoś *nie wie* lub jest
*wprowadzony w błąd* — to dark pattern. Dobre UX działa nawet wtedy, gdy użytkownik w pełni rozumie,
co się dzieje.

---

## Szkielet pod przyszły skill (checklista do przełożenia)

Gdy będziemy tworzyć skill, każdą zasadę można ująć jako regułę „gdy projektujesz X → zastosuj Y → unikaj Z":

| Moment w produkcie | Zasada do zastosowania | Czego unikać |
|---|---|---|
| Formularz / pytania onboardingowe | Smart defaults, ograniczenie liczby wyborów | Puste pola, 20 pytań, defaulty przeciw userowi |
| Start onboardingu / pasek postępu | Endowed progress (start > 0%), Zeigarnik (widoczna luka) | Start od 0%, fałszywy postęp |
| Dostęp do wartości / rejestracja | Reciprocity — wartość przed ścianą logowania | Signup wall na wejściu, bait-and-switch |
| Personalizacja / setup | IKEA effect — lekki, znaczący wkład użytkownika | Empty personalization, wymuszony nadmiar pracy |
| Upgrade / pricing / koniec triala | Loss aversion + anchoring na realnych faktach | Fałszywa pilność/niedobór, myląca kotwica |
| Cała platforma | Krótkie flow, niski cognitive load, wyraźny postęp, re-entry | Przeciążenie, brak zapisu postępu |

---

## Źródła

- UX Peak, „The UX Psychology Behind Apps People Can't Stop Using" — https://www.youtube.com/watch?v=2TlIg3VokY8 (materiał pierwotny; transkrypcja niedostępna do pobrania — błąd 429).
- Appcues, „User psychology: 6 essential principles for better UX design" — https://www.appcues.com/blog/user-psychology-ux-design-principles (goal gradient / endowed progress, redukcja wyborów, Zeigarnik).
- CareerFoundry, „5 Psychology Principles for Better User Experience Design" — https://careerfoundry.com/en/blog/ux-design/psychology-principles-ux-design/ (cognitive load, interaction cost, reciprocity, guest access / login walls).
- Usetiful, „3 Psychological Principles to Reduce User Onboarding Time" — https://blog.usetiful.com/2025/07/psychological-principles-to-reduce-user-onboarding-time.html (Zeigarnik, prawo Hicka i Fittsa).
- UX Magazine, „The Psychology of Onboarding: First Impressions Rule the Brain" — https://uxmag.com/articles/the-psychology-of-onboarding-first-impressions-rule-the-brain (primacy effect, koszt wczesnego tarcia).
- UXArmy, „UX Psychology: How Human Behavior Shapes Better UX" — https://uxarmy.com/blog/ux-psychology-human-behavior-user-experience/ (cognitive load, prawo Hicka, walidacja na realnych użytkownikach).

*Klasyczne podstawy naukowe zasad (do dalszego cytowania w skillu): prospect theory / loss aversion —
Kahneman & Tversky; endowed progress effect — Nunes & Drèze; IKEA effect — Norton, Mochon & Ariely;
reciprocity — Cialdini; Zeigarnik effect — B. Zeigarnik.*
