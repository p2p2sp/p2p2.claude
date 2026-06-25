# Adaptacja do frameworka

Adaptacja przekłada niezależny od technologii [system projektowy](./system-projektowy.md) na jeden
konkretny cel — tak, by Twój kod korzystał z tych samych tokenów i komponentów co reszta produktu.

## Obsługiwane cele

Możesz zaadaptować system do jednej z technologii:

- `pure-css` — czysty CSS,
- `tailwind` — Tailwind CSS,
- `react-shadcn` — React z shadcn/ui,
- `react-mui` — React z Material UI,
- `flutter` — Flutter.

## Jak to działa

1. Najpierw przygotuj [system projektowy](./system-projektowy.md) — to wspólne źródło dla każdej
   adaptacji.
2. Poproś o adaptację do wybranego celu.
3. Powstaje przełożenie systemu na tę technologię, zapisane w `.superui/layout/`.

## Jeden system, wybrana technologia

System projektowy jest niezależny od frameworka; adaptacja wiąże go z jednym celem. Trzymanie wspólnego
źródła sprawia, że decyzje projektowe pozostają spójne, niezależnie od użytej technologii.

## Co dalej

- Zobacz efekt: [Podgląd UI](./podglad-ui.md).
- Wprowadzaj zmiany bezpiecznie: [Strażnik edycji UI](./straznik-edycji-ui.md).
