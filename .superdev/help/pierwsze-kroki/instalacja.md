# Instalacja

Po instalacji wtyczki są aktywne w każdej nowej sesji Claude Code — każda wstrzykuje swój zestaw
reguł i sama kieruje Twoje prośby do właściwej umiejętności.

## Wymagania wstępne

- Działający Claude Code.
- Dostęp do internetu przy pierwszym dodawaniu katalogu wtyczek.

## Kroki

1. Dodaj katalog wtyczek (marketplace):

   ```
   /plugin marketplace add https://github.com/p2p2sp/p2p2.claude
   ```

2. Zainstaluj wybrane wtyczki. Możesz zainstalować obie albo tylko jedną:

   ```
   /plugin install superdev
   /plugin install superui
   ```

3. Gotowe. Od następnej sesji wtyczki działają automatycznie.

## Aktualizacja

Gdy ukaże się nowa wersja, zaktualizuj wtyczki poleceniem:

```
/plugin update
```

Obie wtyczki dzielą jedną numerację wersji, więc aktualizacja obejmuje tę, którą masz zainstalowaną.

## Co dalej

- Pracujesz z superdev → przejdź do **[Konfiguracji superdev](./konfiguracja-superdev.md)**.
- Chcesz zrozumieć sposób korzystania → **[Jak to działa](./jak-to-dziala.md)**.
