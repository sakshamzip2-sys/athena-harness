---
description: Review the current changes (git diff) for bugs, security and edge cases
argument-hint: "[focus]"
---
Review the uncommitted changes (`git diff` and `git diff --staged`; if both are empty, the last commit). Focus on ${@:-correctness, security, error handling and edge cases}. For each finding give file:line, what goes wrong, and the fix. Skip style-only nits. Do not edit files.
