# Website reference

## Interaction states
- hover, focus, visited (links), active/pressed, scroll-triggered (reveal-on-scroll, sticky header), disabled

## Unit mapping
- reference px @1x -> website: 1:1 CSS px, no conversion (content sites rarely ship density-specific layout)

## Component taxonomy
- Atomic: button, link, badge, icon, form field, logo mark
- Composite: hero, nav header, footer, CTA block, feature grid, testimonial/social-proof block, FAQ accordion, contact/lead form

## Expected components checklist
- nav-header - Nav header · composite · every page needs a persistent way to reach other sections
- hero - Hero section · composite · the landing view needs a primary value-proposition block above the fold
- cta-block - CTA block · composite · conversion-focused pages need a repeatable call-to-action pattern
- footer - Footer · composite · users expect secondary links, legal, and contact info at page end
- feature-grid - Feature grid · composite · marketing pages need a scannable way to list benefits
- testimonial-block - Testimonial/social-proof block · composite · unfamiliar visitors need third-party trust signals before converting
- faq-accordion - FAQ accordion · composite · pages selling a decision need pre-emptive objection handling
- contact-form - Contact/lead form · composite · a conversion path needs a way to actually capture the visitor

## Spec guidance
- the hero must convey the value proposition without scrolling on a reference-px viewport of roughly 1280x720
- link states stay distinguishable without color alone (underline by default, or color plus a non-color cue on hover/focus)
- a sticky or scroll-triggered nav needs a defined trigger offset and transition duration
- contact/lead forms need inline validation, never a full-page reload to surface an error
