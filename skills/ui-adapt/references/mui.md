# DTCG → MUI (Material UI) `createTheme` mapping

MUI is a **React component library** whose look is driven by a single theme
object created with `createTheme(...)` and injected via `<ThemeProvider>`. There
is no CSS file to generate; the target theme artifact is a TypeScript module
(`theme.ts`) exporting the theme. Components read the theme through their own
styles and through the `sx` prop / `styled()`.

> Sources: [MUI — Theming](https://mui.com/material-ui/customization/theming/)
> and the [MUI palette](https://mui.com/material-ui/customization/palette/) /
> [typography](https://mui.com/material-ui/customization/typography/) /
> [spacing](https://mui.com/material-ui/customization/spacing/) /
> [`sx` prop](https://mui.com/system/getting-started/the-sx-prop/) docs. Current
> major: **Material UI v9** (verify the installed version in the host project's
> `package.json` before relying on a version-specific key).

## The theme artifact (`theme.ts`)

```ts
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

const theme = createTheme({
  cssVariables: true,            // emit CSS variables (recommended for SSR / theming)
  palette: { /* … */ },
  typography: { /* … */ },
  spacing: 8,                    // base unit; spacing(2) → 16px
  shape: { borderRadius: 8 },
  breakpoints: { /* values */ },
  components: { /* per-component default overrides */ },
});
export default theme;
```

Wrap the app once:

```tsx
<ThemeProvider theme={theme}>
  <CssBaseline />   {/* normalizes + applies theme background/text */}
  <App />
</ThemeProvider>
```

## Top-level theme keys

`createTheme` accepts: **`palette`**, **`typography`**, **`spacing`**,
**`shape`**, `breakpoints`, `components`, `zIndex`, `transitions`. Map the L1
foundations onto these.

## Token → theme mapping

| L1 token (from `tokens.css` / `design-tokens.yaml`) | MUI theme slot |
|---|---|
| brand / accent color | `palette.primary.main` (+ `.light` / `.dark` / `.contrastText`) |
| secondary accent | `palette.secondary.main` (+ light/dark/contrastText) |
| feedback: error / warning / info / success | `palette.error\|warning\|info\|success.main` |
| surface base / text primary | `palette.background.default` / `palette.text.primary` |
| surface raised / text secondary | `palette.background.paper` / `palette.text.secondary` |
| border / divider | `palette.divider` |
| font family | `typography.fontFamily` |
| base body size | `typography.htmlFontSize` + per-variant `fontSize` |
| named text styles (`typography.heading-*`, body, caption) | `typography.h1…h6`, `body1`, `body2`, `caption`, `button`, `overline` |
| spacing base step (4 / 8 px) | `spacing: <step>` (a number = the base unit) |
| control / card radius | `shape.borderRadius` (single base radius; per-component radius via `components.*.styleOverrides`) |
| breakpoints | `breakpoints.values` (`xs/sm/md/lg/xl`) |

### Palette
Each color role is an object with **`main`** (required) and optional **`light`**,
**`dark`**, **`contrastText`**. MUI derives the missing tonal variants from
`main` if you omit them; supply explicit values from the L1 ramps when the system
defines them. The roles are `primary`, `secondary`, `error`, `warning`, `info`,
`success`, plus `background` (`default` / `paper`), `text` (`primary` /
`secondary` / `disabled`), `divider`, and `action.*`. Set
`palette.mode: "light" | "dark"` per scheme; for both modes use
`colorSchemes: { light, dark }` (v6+) so MUI emits the dark overrides.

### Typography
`typography.fontFamily` sets the global stack; each named variant (`h1`–`h6`,
`body1`, `body2`, `subtitle1/2`, `caption`, `button`, `overline`) takes
`fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`. Map the L1
`typography` composites onto these variants by role.

### Spacing
`spacing` is a number = the base unit (default **8px**). The theme exposes a
`theme.spacing(n)` function: `spacing(1)` = 8px, `spacing(2)` = 16px, etc. Use it
in `sx`/`styled`. If the L1 system uses a 4px rhythm, set `spacing: 4`.

### Shape
`shape.borderRadius` is the single base corner radius (px). For multiple radius
roles (control vs card vs pill), keep the base here and override per component via
`components.<MuiX>.styleOverrides.root.borderRadius`.

## `components.md` HOW/WHERE for MUI

Each L1 inventory component maps to a built-in MUI component (no per-component
install — the whole library is one package):

- **Install:** `npm install @mui/material @emotion/react @emotion/styled`.
- **Import:** `import { Button, TextField, Dialog, Drawer, AppBar } from "@mui/material";`
- **Styling:** components read the theme automatically; per-instance overrides
  use the **`sx` prop** (e.g. `sx={{ borderRadius: 2, bgcolor: "primary.main" }}`
  — numeric `borderRadius` multiplies `shape.borderRadius`, color strings resolve
  against the palette). Global per-component defaults live in `theme.components`.

Common L1 → MUI component mapping: button → `Button`; input/field → `TextField`;
select → `Select`; modal/dialog → `Dialog`; right panel/drawer → `Drawer`;
app bar/header → `AppBar` + `Toolbar`; sidebar nav → `Drawer` + `List` /
`ListItemButton`; card → `Card` (+ `CardHeader`/`CardContent`/`CardActions`);
tabs → `Tabs`/`Tab`; badge → `Badge`/`Chip`; avatar → `Avatar`; alert →
`Alert`; tooltip → `Tooltip`; data table → `Table` (or MUI X `DataGrid`).

**Gap policy:** if the L1 inventory has a component MUI does not ship, compose it
from MUI primitives (`Box`, `Stack`, `Paper`, `Typography`) and say so; if no
clean composition exists, write `> ⚠️ Needs input: …`. Never invent a `@mui/*`
component that the docs do not list.
