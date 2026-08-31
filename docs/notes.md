# Pomysły

## superdev

Intent -> Spec -> [Plan -> Build] -> History

- Intent - zawiera intencję co się chce zbudować, kontekst
- Spec - formalny i ustrukturalizowany zapis
- Plan - Rozpisane zadania dla agenta
- Build - Proces budowy według planu (+ ewentualnie spec)
- History - dokumentacja zawierająca opis podsumowujący intent+spec+wnioski z fazy build jeśli powstały odchyłki od planu - jeden dokument

History buduje żywą dokumentację projektu: co, kiedy i jak zostało zbudowane/dodane/zmienione/naprawione w projekcie.

## superui
Są lepsze skile do ui, więc w ui można by zostawić extractory oraz dodać komendy dla zorganizwoania pracy z innymi skilami.

Na przykład audyt UI, który pod spodem uruchamia agentów, którzy używają istniejące skile (przykładowo /impeccable audit). Agenci zwracają wynik i główny skill tylko produkuje raport, albo rekomenduje zmiany, itp.