# Pomysły

## superdev

Intent -> Spec -> [Plan -> Build] -> History

- Intent - zawiera intencję co się chce zbudować, kontekst
- Spec - formalny i ustrukturalizowany zapis
- Plan - Rozpisane zadania dla agenta
- Build - Proces budowy według planu (+ ewentualnie spec)
- Changelog - dokumentacja zawierająca opis podsumowujący intent+spec+wnioski z fazy build jeśli powstały odchyłki od planu - jeden dokument

Changelog buduje żywą dokumentację projektu: co, kiedy i jak zostało zbudowane/dodane/zmienione/naprawione w projekcie.

## superui
Są lepsze skile do ui, więc w ui można by zostawić extractory oraz dodać komendy dla zorganizwoania pracy z innymi skilami.

Na przykład audyt UI, który pod spodem uruchamia agentów, którzy używają istniejące skile (przykładowo /impeccable audit). Agenci zwracają wynik i główny skill tylko produkuje raport, albo rekomenduje zmiany, itp.

## supervibe

### Pre
You are a senior frontend engineer.

I'm building [PROJECT].
Goal: [WHAT IT DOES]
Target users: [AUDIENCE]

Tech stack:
- [FRAMEWORK]
- [STYLING]
- [LIBRARIES]

Core features:
1. [FEATURE]
2. [FEATURE]
3. [FEATURE]

Before coding:
1. Propose the project structure.
2. Identify the key components.
3. Explain your implementation approach.
4. Then start building.

Keep the architecture simple,
scalable, and production-ready.

### UI
Design this interface with a [DESIGN STYLE] aesthetic.

Design direction:

* Layout: [DESCRIPTION]
* Typography: [STYLE]
* Colors: [PALETTE]
* Spacing: [TIGHT / AIRY]
* Components: [STYLE]
* Visual hierarchy: [DESCRIPTION]

Reference:
[IMAGE / WEBSITE / DESIGN]

Before implementing, explain:

1. The visual system
2. The layout hierarchy
3. The interaction patterns

Then implement it.

Do not add unnecessary elements.
Prioritize clarity and consistency.

### Fix
I have this error:
[PASTE ERROR]

Context:
[WHAT I WAS DOING]

Relevant code:
[PASTE CODE]

Debug this systematically.

1. Identify the root cause.
2. Explain why it is happening.
3. Identify the exact file/component responsible.
4. Propose the smallest correct fix.
5. Implement the fix.
6. Verify that the fix doesn't introduce another issue.

Do not rewrite unrelated code.

### Change UI
Modify the existing design.

I want to change:
[EXACT CHANGE]

KEEP UNCHANGED:

* Overall layout
* Typography
* Color system
* Existing functionality
* Responsive behavior
* Component structure

Before making changes:

1. Identify what needs to change.
2. Identify what must remain untouched.
3. Make the SMALLEST NECESSARY CHANGES.

Do not redesign the page.
Do not add new dependencies.
Do not change unrelated components.

Then verify the result across
desktop and mobile.

### Idea
Act as a senior product designer reviewing this idea.

My idea:
[DESCRIBE IDEA]

Target user:
[TARGET USER]

Current approach:
[DESCRIBE APPROACH]

Think critically about it.

Tell me:

1. What's weak or unnecessary?
2. What's missing?
3. What would make it simpler?
4. What would make it more useful?
5. What would you change?

Give me 3 CONCRETE IMPROVEMENTS I can implement immediately.

Don't agree with me just to be helpful. Prioritize the best user experience.