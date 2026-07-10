# DTCG → Flutter (Material 3) `ThemeData` mapping

Flutter styling is driven by a single `ThemeData` passed to `MaterialApp`. Under
Material 3 the color system is a **`ColorScheme`** (role-based, 45 colors) and
text is a **`TextTheme`**. The target theme artifact is a Dart module
(`theme.dart`) exporting the `ThemeData`; widgets read it via
`Theme.of(context)`. There is no CSS — components are built-in widgets, no install
step.

> Sources:
> [Flutter — Use themes to share colors and font styles](https://docs.flutter.dev/cookbook/design/themes),
> [`ColorScheme` API](https://api.flutter.dev/flutter/material/ColorScheme-class.html),
> [`ThemeData` API](https://api.flutter.dev/flutter/material/ThemeData-class.html),
> [`TextTheme` API](https://api.flutter.dev/flutter/material/TextTheme-class.html).
> Material 3 is the default (`useMaterial3: true` is the default in current
> stable Flutter — verify the host project's Flutter SDK before relying on a
> version-specific behavior).

## The theme artifact (`theme.dart`)

Two ways to build the `ColorScheme`:

**A. Seed-generated** (when the L1 system has one dominant brand color and no full
role palette) — `ColorScheme.fromSeed` derives a harmonious, accessibility-checked
Material 3 palette from one seed:

```dart
final theme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF3366F2),   // L1 brand/accent
    brightness: Brightness.light,
  ),
  textTheme: /* mapped TextTheme */,
);
```

**B. Explicit** (when the L1 system documents the role colors — preferred for
fidelity) — set each role directly with `const ColorScheme(...)` (or
`ColorScheme.fromSeed(...).copyWith(...)` to override specific roles).

Dark mode: build a second `ColorScheme` with `brightness: Brightness.dark` (seed)
or the values from the L1 `tokens.css` `.dark` block (explicit), and pass it as
`darkTheme:` on `MaterialApp`. **Only** emit a dark theme if the L1 system has
dark values — do not fabricate one.

## Token → `ColorScheme` role mapping

`ColorScheme` is role-based; map L1 semantic colors onto roles, not raw hexes:

- brand / accent (primary) → `primary` / `onPrimary` (text on it)
- primary container / muted brand surface → `primaryContainer` / `onPrimaryContainer`
- secondary accent → `secondary` / `onSecondary` (+ `secondaryContainer`)
- tertiary / extra accent → `tertiary` / `onTertiary`
- surface base → `surface` / `onSurface`
- raised / elevated surfaces (cards, sheets) → `surfaceContainerLowest`…`surfaceContainerHighest` (elevation tiers)
- muted text on surface → `onSurfaceVariant`
- border / divider → `outline` / `outlineVariant`
- feedback: error → `error` / `onError` (+ `errorContainer`)
- overlay / scrim → `scrim`, `shadow`

`ColorScheme.fromSeed` parameters: **`seedColor`** (required), **`brightness`**
(`Brightness.light`/`dark`), `dynamicSchemeVariant` (e.g. `tonalSpot`),
`contrastLevel`, plus per-role overrides. Apply the scheme via
`ThemeData(colorScheme: …, useMaterial3: true)`.

## Token → `TextTheme` mapping

Material 3 `TextTheme` has named roles in three size tiers: `displayLarge/Medium/
Small`, `headlineLarge/Medium/Small`, `titleLarge/Medium/Small`,
`bodyLarge/Medium/Small`, `labelLarge/Medium/Small`. Map L1 named text styles by
role:

- hero / page title → `displayLarge` / `headlineLarge`
- section heading (`heading-*`) → `headlineMedium` / `titleLarge`
- card / list title → `titleMedium`
- body → `bodyLarge` / `bodyMedium`
- caption / helper → `bodySmall` / `labelSmall`
- button / chip label → `labelLarge`

Each slot is a `TextStyle(fontFamily, fontSize, fontWeight, height, letterSpacing)`
— `height` is the line-height **multiplier** (lineHeight / fontSize), not px.

## Other foundations

- **Spacing/radii:** Flutter has no spacing scale in `ThemeData`; expose the L1
  spacing/radius steps as Dart `const double` values (e.g. `class Spacing { static
  const s4 = 16.0; }`) and use them in `EdgeInsets`/`BorderRadius`. Set component
  radius via `ThemeData(cardTheme:, …)` / per-widget `shape:`.
- **Elevation:** map the L1 elevation scale onto Material elevation levels
  (`elevation:` on `Card`/`Material`); M3 also tints elevated surfaces via the
  `surfaceContainer*` roles above.

## `components.md` HOW/WHERE for Flutter

- **Install:** none — Material/Cupertino widgets ship with Flutter.
- **Import:** `import 'package:flutter/material.dart';` (or
  `package:flutter/cupertino.dart` for iOS-style).
- Widgets read `Theme.of(context).colorScheme` / `.textTheme` automatically.

Common L1 → widget mapping: button → `FilledButton`/`OutlinedButton`/`TextButton`;
input/field → `TextField` (+ `InputDecoration`); select → `DropdownButton` /
`DropdownMenu`; modal/dialog → `showDialog` + `AlertDialog`/`Dialog`; right
panel/drawer → `Drawer` / `NavigationDrawer` (in the `Scaffold.endDrawer` slot
when it opens from the trailing edge); app bar → `AppBar`;
sidebar nav → `NavigationRail` / `NavigationDrawer`; bottom nav → `NavigationBar`;
card → `Card`; tabs → `TabBar`/`TabBarView`; badge → `Badge`; chip → `Chip`;
avatar → `CircleAvatar`; alert/snackbar → `SnackBar` / `MaterialBanner`; tooltip →
`Tooltip`; list → `ListView` + `ListTile`; data table → `DataTable`.

**Gap policy:** if a built-in widget does not exist for an L1 entry, compose it
from primitives (`Container`, `Row`/`Column`, `Material`, `InkWell`) and say so;
otherwise write `> NEEDS INPUT: <what's missing>`. Never invent a widget the API
does not document. (Note: `superui:web-preview` cannot render Flutter — direct
the user to DartPad / a Flutter run for visual preview.)
