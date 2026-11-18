---
description: Security review of a file or the current changes
argument-hint: "[file or area]"
---
Do a security review of ${@:-the current uncommitted changes}. Look for injection, auth/authorization gaps, secrets in code, unsafe deserialization, path traversal, SSRF and unsafe shell use. For each finding give file:line, a concrete exploit scenario and the fix. Do not edit files.
