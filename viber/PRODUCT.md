# Założenia

- Plugin `viber` musi poprawnie działać na wszelakiego rodzaju projektach. Jeśli zadania nie są programistyczne lub kod nie jest testowalny to plan i proces implementacji musi o uwzględniać.

- Kod przez codera musi być pisany tak, aby TDD i testy pokrywały przypadki w taki sposób, aby nie był wymagany test integracyjny z zewnętrznymi usługami takimi jak baza danych.

- Testy integracyjne są tylko uzupełnieniem do testów jednostkowych, które pokrywają kilka warstw, a nie bazą potwierdzającą działanie danej funkcji.

- Testy integracyjne uruchamiane tylko i wyłącznie raz w finalnym kroku "Finalne uruchomienie testów".

- Testy integracyjne uruchamiane jako ostatnie zadania raczej szeregowo - nałożenie się ciężkich zadań z testami integracyjnymi może być ciężkie.

- Testów jednostkowych czy TDD powinna być znaczna przewaga nad ilością testów integracyjnych.

- Testy integracyjne powinny używać test-containers kiedy to tylko możliwe.

- Zachowanie założeń testowania od szczegółu do ogółu (najpierw testy jednostkowe - na koniec integracyjne) wspomaga implementację współbieżną zadań.