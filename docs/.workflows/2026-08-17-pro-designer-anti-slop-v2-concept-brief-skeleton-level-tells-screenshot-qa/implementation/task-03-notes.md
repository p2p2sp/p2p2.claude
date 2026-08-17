## Task 3 notes

- The "Plan-then-critique pass" replacement kept no `## ` heading at all (just the one-line pointer as a
  standalone paragraph between "One signature element" and "Copy is design material") rather than reusing the
  old heading text with new body - the task's own DoD test greps for the literal heading string
  "Plan-then-critique pass" and expects it gone, so the heading itself had to be removed, not just its body.

no other deviations
