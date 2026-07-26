# Accessibility: Contrast, Focus, Non-Color Signals, Targets

Read when writing any CSS/HTML with colors, text, interactive elements, or touch targets - before emitting the first color value.

## Text contrast (WCAG 2.2 SC 1.4.3, Level AA)
- Normal text: >= 4.5:1 against its background. Thresholds are exact - 4.499:1 fails; never round up.
- Large text may drop to 3:1. "Large" = >= 18pt (~24px) regular OR >= 14pt (~18.5px) bold. Anything below 24px regular / 18.5px bold needs the full 4.5:1 - do not apply the 3:1 allowance to 16-20px headings.
- AAA polish target: 7:1 normal, 4.5:1 large (SC 1.4.6).
- On pure white, the lightest passing gray for normal text is #767676 (~4.54:1). Anything lighter fails.
- Placeholder text, helper text, captions, timestamps, and hover/focus-revealed text all count under 1.4.3. Never ship browser-default-looking light gray (#999 or lighter on white) placeholders.
  - Bad: `::placeholder { color: #AAA; }` on white (~2.3:1)
  - Good: `::placeholder { color: #767676; }` or darker
- Only exemptions: genuinely disabled controls, logos/brand names, pure decoration.
- Low-contrast text is the most common detected accessibility failure on the web (~80% of top-million home pages every year since 2019, WebAIM Million) - and the most common defect in AI-generated UIs.

## UI component and state contrast (SC 1.4.11, Level AA)
- Everything needed to identify a component or its state: >= 3:1 against adjacent colors. 2.999:1 fails.
- Applies to: input borders, checkbox/radio marks, toggle states, functional icons, focus indicators, selected-state indicators.
- A form input with no other visible indicator needs a border >= 3:1 against the page background - no borderless white-on-white or #EEE-on-white inputs (#DDD on white is ~1.3:1).
- Hover styling is supplemental and exempt; focused/selected state indication is NOT exempt.

## Focus visibility (SC 2.4.7 AA; SC 2.4.13 AAA)
- NEVER `outline: none`, `outline: 0`, or script-removed focus without an equally visible replacement - documented WCAG failure F78. Every keyboard-operable element (links, buttons, inputs, `tabindex` custom controls) must show focus.
- Default recipe: `:focus-visible { outline: 2px solid <high-contrast color>; outline-offset: 2px; }`
- Use `:focus-visible`, not bare `:focus` - keyboard users get the ring, mouse clicks don't flash it.
- Indicator minimums (SC 2.4.13): at least a 2 CSS px thick perimeter of the component; >= 3:1 between focused and unfocused states of the same pixels; >= 3:1 against adjacent colors. A two-color ring (light inner + dark outer) works on any background.

## Never color alone (SC 1.4.1, Level A)
- Every color-coded meaning needs a redundant non-color cue - ~1 in 12 men has a color-vision deficiency; screen readers convey no color.
  - Form errors: icon + text message, never just a red border.
  - Statuses: label or icon, never just a green/red dot.
  - Chart series: patterns, direct labels, or shapes, never just a colored legend.
  - Required fields: asterisk or the word "required", never just red.
- Links inside body text: underline by default. If you remove the underline: link color >= 3:1 vs surrounding text AND >= 4.5:1 vs background AND underline reappears on hover/focus. Nav/menu links in obvious link contexts are exempt from the 3:1-vs-text rule.

## Text over images
- Text over images/gradients must pass its ratio (4.5:1, 3:1 large) at EVERY point - verify against the lightest pixel it can sit on, not the average. Responsive crops and user-supplied images make the safe area unpredictable.
- Fixes: semi-transparent dark scrim (NN/g example needed 50% opacity, not 30%), bottom "floor fade" gradient, blurred region behind text, or solid/semi-opaque text container.
- Same rule for functional icons over imagery (a save/close/play control on a photo): give the icon a high-contrast backing - a solid or semi-opaque circle/pill behind it, or a drop shadow - so it clears 3:1 against whatever pixel it lands on (SC 1.4.11), not just the average.

## De-emphasis without low contrast
- NEVER use low contrast as a de-emphasis or aesthetic device. Hierarchy for secondary text = smaller size, lighter weight, whitespace, position - not lightness below the 4.5:1 floor.
- Page feels too dense? Remove or collapse content (accordion, progressive disclosure) - don't gray it down.
- Grayed-out styling is reserved exclusively for genuinely disabled controls - the one exempt interactive case. Never style active/clickable/informative content in the disabled-gray register.

## Touch / pointer targets
- WCAG 2.5.8 (AA): 24 x 24 CSS px minimum.
- WCAG 2.5.5 (AAA): 44 x 44 CSS px.
- Apple HIG (iOS/iPadOS/watchOS): 44 x 44 pt.
- Material / Android: 48 x 48 dp (~9mm; add 8dp+ spacing between targets).
- WCAG AA spacing exception: an undersized target passes if a 24 CSS px diameter circle centered on it does not intersect another target or another such circle.
- Apple's unit is points (density-independent), not pixels; visionOS wants 60 x 60 pt.
- For anything a finger touches, design to 44-48, not the 24px legal floor. On the 8px grid that means 48px controls, or a 40px control with its hit area expanded to 48px (padding or overlay).

## Resize and spacing resilience
- Text must resize to 200% without horizontal scrolling to read a line (SC 1.4.4 / 1.4.8). Use relative units; never fixed-height text containers.
- Content must not break under user overrides (SC 1.4.12 AA): line-height 1.5x font size, paragraph spacing 2x, letter spacing 0.12x, word spacing 0.16x - avoid `overflow: hidden` on text and fixed heights that clip.

## Contrast is a build step, not a review step
- Contrast is deterministic: ratio = (L1 + 0.05) / (L2 + 0.05) via WCAG relative luminance. Do not eyeball it.
- Run `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts"` on EVERY foreground/background pair you emit - body text, placeholders, borders, icons, focus rings, text-over-scrim - and fix failures before delivery.
- Pass each pair's type (`normal` | `large` | `ui`) so the verdict and exit code use the right threshold: 4.5:1 body, 3:1 large text, 3:1 components/focus. No rounding in your favor.

## Sources
- Understanding SC 1.4.3 Contrast (Minimum) - https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Understanding SC 1.4.11 Non-text Contrast - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Understanding SC 2.4.7 Focus Visible - https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- Understanding SC 2.4.13 Focus Appearance - https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Understanding SC 1.4.1 Use of Color - https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- Understanding SC 2.5.8 Target Size (Minimum) - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Understanding SC 2.5.5 Target Size (Enhanced) - https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- Understanding SC 1.4.12 Text Spacing - https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- Understanding SC 1.4.8 Visual Presentation - https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html
- Apple HIG Accessibility - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Google Android touch target guidance - https://support.google.com/accessibility/android/answer/7101858
- WebAIM: Contrast and Color Accessibility - https://webaim.org/articles/contrast/
- WebAIM Million - https://webaim.org/projects/million/
- NN/g: Text Over Images - https://www.nngroup.com/articles/text-over-images/
- NN/g: Low-Contrast Text Is Not the Answer - https://www.nngroup.com/articles/low-contrast/
