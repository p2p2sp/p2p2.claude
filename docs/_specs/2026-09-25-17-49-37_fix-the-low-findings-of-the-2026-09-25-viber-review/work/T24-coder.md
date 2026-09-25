Fixed T24 by editing only root `README.md`: replaced the retired "same trip" comparison in
viber's catalog row with a self-contained description, and appended the optional `node`
(settings merge) and Playwright (`/viber:e2e`) tools to viber's requirements row, matching the
wording already used in `viber/README.md`'s Install section. No test file targets root
`README.md` content, so verification is limited to the task's own grep commands.
