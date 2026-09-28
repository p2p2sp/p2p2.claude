- Rewrote `viber/PRODUCT.md`'s testing-assumption bullets per C2's four layers; kept the two
  unrelated bullets (project-kind coverage, `implementor` entry note) untouched.
- Deleted the old "unit tests first, integration tests last supports building tasks
  concurrently" line entirely rather than rewording it: it asserted a scheduling order the new
  model no longer holds, and rewording it risked drifting into the implementor-scheduling area
  that's out of scope for this task.
- Only T5.md itself references `PRODUCT.md` among this run's task files, so no other task's
  contract depended on the old wording.
