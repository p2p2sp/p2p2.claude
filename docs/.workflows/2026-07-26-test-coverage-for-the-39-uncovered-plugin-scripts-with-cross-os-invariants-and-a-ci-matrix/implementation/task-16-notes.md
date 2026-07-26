The task's Contracts line describes `decodePng(buf) → { width, height, data }`; the actual shipped signature
is `{ width, height, rgb, pad }` (see `superui/scripts/vendor/png-decode.ts`'s `DecodedPng` interface) - tests
assert against the real field name `rgb`, since that is what the module under test actually exports.
