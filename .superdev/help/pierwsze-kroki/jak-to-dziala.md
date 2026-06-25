# Jak to działa

Z wtyczkami nie musisz pamiętać listy poleceń. Opisujesz Claude swój cel zwykłym językiem, a wtyczka
sama rozpoznaje, która umiejętność pasuje, i ją uruchamia.

## Opisuj cel, nie polecenie

Zamiast szukać właściwej komendy, napisz, co chcesz osiągnąć — na przykład „dodaj logowanie przez
e-mail" albo „zrób podgląd tej karty produktu". Wtyczka dopasuje umiejętność do treści Twojej prośby.
Działa to niezależnie od języka, w którym piszesz.

## Nieliczne polecenia wpisuje się wprost

Część czynności ma własne polecenie ze znakiem `/`, bo uruchamiasz je świadomie i jednorazowo —
na przykład `/setup` (konfiguracja projektu) czy `/plugin install` (instalacja). Resztą kieruje
opis zadania.

## Plan przed kodem (superdev)

Gdy prosisz o zmianę w kodzie, superdev najpierw przeprowadza krótki wywiad i przygotowuje plan, a
implementację zaczyna dopiero po jego zatwierdzeniu. Planowanie zawsze odbywa się w trybie planu —
niezależnie od tego, w jakim trybie zaczynasz. Dzięki temu przed napisaniem kodu wiesz, co dokładnie
się wydarzy. Szczegóły: [Planowanie i implementacja](../superdev/planowanie-i-implementacja.md).

## Każda wtyczka działa we własnym zakresie

superdev i superui mają oddzielne zestawy reguł i nie zależą od siebie. Jeśli masz zainstalowane obie,
obie są aktywne równolegle — prośby o kod trafiają do superdev, a o interfejs do superui.

## Co dalej

- **[superdev](../superdev/README.md)** — co potrafi ekosystem wytwarzania.
- **[superui](../superui/README.md)** — co potrafi ekosystem projektowy.
