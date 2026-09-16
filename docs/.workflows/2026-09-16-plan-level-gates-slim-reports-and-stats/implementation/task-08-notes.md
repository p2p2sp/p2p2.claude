## Runs
- node --test "tests/**/*.test.ts" -> tests 537, pass 537, fail 0
- node --test tests/superdev/decompose.test.ts -> tests 35, pass 35, fail 0

Approach step 3 asked the marker test for a marked and an unmarked task; it also got a third fixture task carrying an empty `- Review:` value, so the failure mode "empty value prints `-`" is proven directly rather than only by analogy with the unmarked row.
