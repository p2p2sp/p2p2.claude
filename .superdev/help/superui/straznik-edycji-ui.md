# Strażnik edycji UI

Strażnik pilnuje, by zmiany w interfejsie opierały się na udokumentowanym
[systemie projektowym](./system-projektowy.md), a nie na wartościach wymyślonych ad hoc.

## Co robi

Zanim powstanie zmiana w UI, strażnik wiąże ją z udokumentowanymi tokenami, komponentami i
fundamentami systemu. Dzięki temu nowy kod używa tych samych kolorów, odstępów i elementów co reszta
produktu — zamiast wprowadzać niespójne, doraźne wartości.

## Kiedy działa

Wtedy, gdy projekt ma już system zaadaptowany do konkretnego celu (zob.
[Adaptacja do frameworka](./adaptacja-do-frameworka.md)). Każda edycja interfejsu jest najpierw
osadzana w tym systemie.

## Dlaczego to pomaga

Spójność interfejsu utrzymuje się sama. Nie musisz pamiętać, który token odpowiada danemu kolorowi —
zmiana zostaje przypisana do właściwego elementu systemu, zanim trafi do kodu.

## Powiązane tematy

- [System projektowy](./system-projektowy.md) — źródło, do którego strażnik przypisuje zmiany.
- [Adaptacja do frameworka](./adaptacja-do-frameworka.md) — warunek, by strażnik miał z czym wiązać
  edycje.
