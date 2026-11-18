#!/usr/bin/env python3
"""Build Athena-harness: the pi coding agent (MIT, pinned 1.5.2) rebranded as Athena's own harness.

  python3 tools/build_harness.py      ->  athena-harness/  (binary: athena-harness/dist/bundle/cli.js)

What changes (owner 2026-11-18: never show "pi" or PI_* to the user or the model):
  * package.json: name athena-harness, piConfig {name: athena, configDir: .athena} -> title "athena", config dir
    ~/.athena, agent/session dir env vars ATHENA_CODING_AGENT_DIR / ..._SESSION_DIR (pi derives these from piConfig).
  * System prompt: "running inside Athena harness"; the pi-documentation section is replaced by one neutral line.
  * Bash tool: exposes ATHENA_SESSION_ID / ATHENA_SESSION_FILE / ATHENA_PROVIDER / ATHENA_MODEL /
    ATHENA_REASONING_LEVEL instead of PI_*, and strips every PI_* variable from the environment the model's shell sees.
  * LICENSE (upstream MIT, Copyright (c) 2025 Mario Zechner) kept verbatim + NOTICE naming the upstream project.
Every patch asserts its exact match count, so an upstream change fails the build instead of shipping half-renamed.
"""
import json
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "harness/node_modules/@earendil-works/pi-coding-agent")
DST = os.path.join(HERE, "athena-harness")
CHUNK = "dist/bundle/chunks/chunk-VEJDBY3O.js"
UPSTREAM_VERSION = "1.5.2"
LICENSE_FILE = os.path.join(HERE, "tools/pi-LICENSE")  # upstream MIT text, fetched once (gh api repos/earendil-works/pi/contents/LICENSE)

DOCS_START = "promptSections.docs=`Pi documentation (read only"
DOCS_END = "following related cross-references.`"
PATCHES = [  # (old, new, expected count)
    ("You are a coding assistant running inside pi, a coding agent harness.",
     "You are a coding assistant running inside Athena harness, a coding agent harness.", 1),
    ("You can inspect PI_* environment variables for current model and session details.",
     "You can inspect ATHENA_* environment variables for current model and session details.", 2),
    # The model's shell must not see PI_* names or the API key the harness uses to call Athena.
    ("let env={...getShellEnv()};",
     "let env={...getShellEnv()};for(const k of Object.keys(env))(k.startsWith(\"PI_\")||k===\"ATHENA_API_KEY\""
     "||k===\"VLLM_API_KEY\")&&delete env[k];", 1),
    # Thinking picker (owner 2026-11-18): low = ~4k tokens (budget set in agent settings thinkingBudgets).
    ("Light reasoning (~2k tokens)", "Light reasoning (~4k tokens)", 2),
    # /bug can upload sessions to the upstream developers; the wrapper sets PI_OFFLINE=1 so it only exports a zip.
    ("Report a bug to the Pi developers", "Save a bug report (zip) for Athena Research", 1),
    # Self-update would install the upstream package over this build; the wrapper refuses `update self|pi`.
    ("update [source|self|pi]   Update pi, extensions, or model catalogs",
     "update [source]           Update extensions or model catalogs", 1),
    ("update [source|self|pi]", "update [source]", 1),
    ("Update pi, installed packages, or model catalogs.", "Update installed packages or model catalogs.", 1),
    ("This report goes to the Pi developers (Earendil) and is not shared publicly. It includes your pi version,",
     "This report is saved on this computer as a zip; nothing is uploaded. It includes your harness version,", 1),
] + [(f"env.PI_{k}", f"env.ATHENA_{k}", 2) for k in
     ("SESSION_ID", "SESSION_FILE", "PROVIDER", "MODEL", "REASONING_LEVEL")]


def main():
    if not os.path.exists(SRC):  # fresh machine: install the pinned upstream from harness/package-lock.json
        subprocess.run(["npm", "ci", "--ignore-scripts"], cwd=os.path.join(HERE, "harness"), check=True)
    pkg = json.load(open(os.path.join(SRC, "package.json")))
    assert pkg["version"] == UPSTREAM_VERSION, f"expected pi {UPSTREAM_VERSION}, found {pkg['version']}"
    shutil.rmtree(DST, ignore_errors=True)
    shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns("*.map", "docs", "examples", "CHANGELOG.md", "README.md"))

    p = os.path.join(DST, CHUNK)
    s = open(p).read()
    i, j = s.find(DOCS_START), s.find(DOCS_END)
    assert s.count(DOCS_START) == 1 and j > i > 0, "docs section anchor changed upstream"
    s = s[:i] + 'promptSections.docs="Harness: Athena harness by Athena Research."' + s[j + len(DOCS_END):]
    for old, new, n in PATCHES:
        got = s.count(old)
        assert got == n, f"patch anchor {old[:50]!r}: expected {n}, found {got}"
        s = s.replace(old, new)
    for leftover in ("running inside pi", "PI_* environment", "env.PI_MODEL", "Pi documentation", "Pi developers",
                     "self|pi", "Update pi,", "~2k tokens"):
        assert leftover not in s, f"leftover after patching: {leftover}"
    open(p, "w").write(s)
    # Runtime dependencies (jiti loads extensions, typebox for their schemas) come from the pinned upstream install.
    os.symlink(os.path.join("..", "harness", "node_modules"), os.path.join(DST, "node_modules"))

    pkg.update({"name": "athena-harness", "version": f"{UPSTREAM_VERSION}-athena.1",
                "description": "Athena harness: the coding-agent harness for Athena (Athena Research). Fork of pi (MIT).",
                "bin": {"athena-harness": "dist/bundle/cli.js"},
                "piConfig": {"name": "athena", "configDir": ".athena"}, "license": "MIT"})
    pkg.pop("repository", None); pkg.pop("homepage", None); pkg.pop("bugs", None)
    json.dump(pkg, open(os.path.join(DST, "package.json"), "w"), indent=2)
    lic = open(LICENSE_FILE).read()
    assert "MIT License" in lic and "Mario Zechner" in lic, "upstream licence text changed; check before shipping"
    open(os.path.join(DST, "LICENSE"), "w").write(lic)
    open(os.path.join(DST, "NOTICE"), "w").write(
        "Athena harness is a modified fork of pi (https://github.com/earendil-works/pi), version "
        f"{UPSTREAM_VERSION}, used under the MIT License (see LICENSE). Changes: product name, configuration "
        "directory, environment variable names and system-prompt wording.\n")
    print("built", DST, "| patches:", len(PATCHES) + 1, "| version", pkg["version"])


if __name__ == "__main__":
    main()
