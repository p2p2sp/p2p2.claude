# Mobile reference

## Interaction states
- pressed, long-press, focused (keyboard/switch control), disabled, error, loading, selected, swipe (reveal actions), drag, pull-to-refresh

## Unit mapping
- reference px @1x -> mobile: iOS pt at 1x and Android dp at mdpi/1x both match reference px 1:1; scale by the device's density multiplier (@2x/@3x, hdpi/xhdpi/xxhdpi) only when exporting bitmap assets, never when speccing layout

## Component taxonomy
- Atomic: button, text field, switch, checkbox, avatar, badge, icon, chip, segmented control
- Composite: tab bar, nav bar (top app bar), bottom sheet/action sheet, list row, card, toast/snackbar, pull-to-refresh header, modal/full-screen dialog

## Expected components checklist
- tab-bar - Tab bar · composite · most native/hybrid apps need persistent bottom-level navigation
- nav-bar - Nav bar (top app bar) · composite · users need a title plus back/action affordance per screen
- button-primary - Primary button · atomic · every action-taking flow needs one clear commit control
- input-text - Text field · atomic · most data entry starts with a labeled text field
- list-row - List row · composite · scrollable content needs a repeatable row pattern
- sheet - Bottom sheet · composite · mobile needs a lightweight overlay for secondary actions or pickers
- empty-state - Empty state · composite · every list needs a first-run or zero-result treatment
- toast-snackbar - Toast/snackbar · composite · async actions need transient status feedback
- loading-indicator - Loading indicator · atomic · async content needs a visible loading state

## Spec guidance
- touch-target floor: 44x44 pt (iOS HIG) or 48x48 dp (Material), whichever the platform reference in the source screenshots implies; add 8dp+ spacing between adjacent targets
- pressed feedback must render immediately (no perceptible delay) so a tap never reads as a dead tap
- destructive swipe actions need a confirm step or an undo window, never a silent delete
- edge-anchored surfaces (tab bar, bottom sheet) account for safe-area insets (notch, home indicator)
