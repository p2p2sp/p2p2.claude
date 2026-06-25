# Dokumentacja użytkownika

superdev pomaga tworzyć pomoc dla osób, które będą korzystać z budowanego przez Ciebie produktu.
To dokumentacja dla **użytkowników końcowych** — odrębna od pamięci projektu, która służy Claude.

## Czym różni się od pamięci projektu

- **Pamięć projektu** (`CLAUDE.md`, `.claude/rules/`) jest dla Claude — opisuje, jak budować produkt.
- **Dokumentacja użytkownika** jest dla ludzi — wyjaśnia, jak z produktu korzystać.

Ta strona, którą właśnie czytasz, powstała tym samym sposobem.

## Jak z tego korzystać

Poproś Claude o dokumentację wybranej funkcji albo całego produktu. Powstanie zestaw stron pisanych
z myślą o czytelniku:

- **Zorientowanych na zadanie** — odpowiadają na pytanie „jak zrobić X?", a nie „co to robi".
- **Najważniejsze najpierw** — wynik, potem kroki, potem szczegóły i tło.
- **Jeden temat na stronę** — łatwiej znaleźć i czytać.
- **Prostym językiem** — krótkie zdania, strona czynna, czas teraźniejszy.

Struktura katalogów odzwierciedla strukturę nawigacji: układ folderów *jest* drzewem nawigacji.

## Dokładność ponad zgadywanie

Dokumentowane jest tylko to, co da się potwierdzić. Jeśli jakiegoś szczegółu nie można ustalić, Claude
zapyta zamiast zmyślać — strona pewnie błędna jest gorsza niż jej brak.

## Wiele języków

Jeśli pomoc ma wyjść w kilku językach, jeden jest źródłowy, a pozostałe to jego wierne tłumaczenia:
ta sama struktura i kolejność, nazwy elementów interfejsu zgodne z UI w danym języku, poprawna pisownia
z wszystkimi znakami diakrytycznymi.

## Gdzie trafia dokumentacja

Do katalogu `.superdev/help/` w projekcie. Układ folderów odwzorowuje zaprojektowaną nawigację.
