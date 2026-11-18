---
description: Find and fix a bug or failing tests, then prove it with a test run
argument-hint: "[what is broken]"
---
Fix this: ${@:-the failing tests in this project}.
1. Reproduce it first (run the failing test or command) and show the output.
2. Find the root cause before editing; say what it is in one sentence.
3. Make the smallest correct change.
4. Run the full relevant test suite again and show the actual output. Do not say it passes unless you ran it.
