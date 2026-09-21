# Założenia

- Plugin `viber` musi poprawnie działać na wszelakiego rodzaju projektach. Jeśli zadania nie są programistyczne lub kod nie jest testowalny to plan i proces implementacji musi o uwzględniać.

- Kod przez codera musi być pisany tak, aby TDD i testy pokrywały przypadki w taki sposób, aby nie był wymagany test integracyjny z zewnętrznymi usługami takimi jak baza danych.

- Testy integracyjne są uzupełnieniem do testów jednostkowych, a nie bazą potwierdzającą działanie danej funkcji.

- Testy integracyjne uruchamiane tylko i wyłącznie raz w finalnym kroku "Finalne uruchomienie testów".