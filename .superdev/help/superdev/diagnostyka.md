# Diagnostyka i specyfikacje

Poza głównym tokiem wdrożenia superdev wspiera trzy częste sytuacje: pracę od testów, szukanie
przyczyny błędu i przygotowanie specyfikacji technicznej.

## Praca od testów (TDD)

Gdy chcesz najpierw opisać oczekiwane zachowanie testem, a potem doprowadzić kod do jego spełnienia,
poproś o podejście „test najpierw". Claude zacznie od testu, a następnie wdroży kod, który go
zalicza.

## Debugowanie

Gdy coś nie działa, opisz objaw — błąd, niespodziewany wynik, padający test. Claude poprowadzi
diagnostykę: ustali przyczynę, zanim zaproponuje poprawkę, zamiast zgadywać.

## Specyfikacje techniczne

Gdy potrzebujesz uzgodnić, *co* i *jak* zostanie zbudowane, zanim ruszy implementacja, poproś o
specyfikację. Powstanie dokument opisujący zakres i podejście — dobry punkt wyjścia do planu.

## Co wybrać

- Znasz oczekiwane zachowanie i chcesz je zabezpieczyć testem → **praca od testów**.
- Masz działający kod, który zachowuje się źle → **debugowanie**.
- Zmiana jest na tyle duża, że warto ją najpierw rozpisać → **specyfikacja**, a potem
  [planowanie i implementacja](./planowanie-i-implementacja.md).
