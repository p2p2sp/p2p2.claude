# System projektowy

System projektowy to spójny, niezależny od frameworka opis wyglądu produktu: kolory, typografia,
odstępy i komponenty. Powstaje raz i staje się jednym źródłem prawdy, z którego korzystają wszystkie
adaptacje do konkretnych technologii.

## Co możesz zrobić

- **Odtworzyć system z istniejącego UI.** Na podstawie obecnego interfejsu superui wydobywa tokeny,
  fundamenty i komponenty i spisuje je jako uporządkowany system projektowy.
- **Dodać nowy komponent.** Gdy potrzebujesz elementu, którego jeszcze nie ma, zostaje on
  zaprojektowany i dopisany do systemu — spójnie z resztą.

## Dlaczego niezależny od frameworka

System opisuje *czym* rzeczy są (token koloru, skala odstępów, anatomia komponentu), a nie *jak*
zapisać je w danej technologii. Dzięki temu ten sam system może zasilić różne adaptacje — bez
powielania decyzji projektowych.

## Gdzie powstaje

W katalogu `.superui/layout/` w projekcie. To stąd korzysta adaptacja do konkretnego frameworka.

## Co dalej

Mając system, przełóż go na technologię: zob.
[Adaptacja do frameworka](./adaptacja-do-frameworka.md).
