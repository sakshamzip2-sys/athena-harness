# Athena harness

The terminal coding agent for [Athena-27B](https://huggingface.co/Batman787/Athena-27B), by Athena Research.

Athena harness gives the model four tools (read, bash, edit, write), the slash commands developers expect, switchable
thinking, and a small launcher that wires everything to your Athena endpoint. It is the setup Athena-27B was tuned
and evaluated with.

## Quick start

Needs Node.js 22.19 or newer, Python 3, git.

```sh
git clone https://github.com/sakshamzip2-sys/athena-harness && cd athena-harness
cp .env.example .env && chmod 600 .env      # set ATHENA_URL and VLLM_API_KEY
ln -s "$PWD/athena" ~/.local/bin/athena     # optional: put `athena` on your PATH
mkdir -p ~/athena-playground && cd ~/athena-playground && athena
```

The first run builds the harness (`tools/build_harness.py`: installs the pinned core from `harness/package-lock.json`
and applies the Athena patches). Run it inside a project folder: the agent can edit everything below where it starts,
so the launcher refuses `/`, your home folder and the harness folder itself.

## Serving Athena-27B

Any OpenAI-compatible server works. With vLLM:

```sh
vllm serve Batman787/Athena-27B --served-model-name athena \
  --language-model-only --enable-prefix-caching --mamba-cache-mode align \
  --enable-auto-tool-choice --tool-call-parser qwen3_xml --reasoning-parser qwen3 \
  --default-chat-template-kwargs '{"enable_thinking": false}' \
  --override-generation-config '{"temperature": 0.8}' \
  --max-model-len 131072 --max-num-seqs 128 --api-key "$VLLM_API_KEY"
```

## Commands

| Command | What it does |
| --- | --- |
| `/effort [off\|low\|medium\|high\|status]` | Thinking level: off, or about 4k / 8k / 16k thinking tokens. Shift+Tab cycles it |
| `/clear`, `/new` | Start a fresh conversation |
| `/context` | How much of the context window is used |
| `/status` | Model, thinking level, context, directory, tools |
| `/diff` | Uncommitted changes in the project |
| `/init` | Write an `AGENTS.md` guide for the project |
| `/doctor` | Check the endpoint, model, git and web backend |
| `/help` | List every command |
| `/fix`, `/test`, `/review`, `/security-review`, `/explain`, `/plan`, `/refactor`, `/debug`, `/commit`, `/docs` | Task templates |
| `/compact`, `/copy`, `/export`, `/model`, `/resume`, `/fork`, `/tree`, `/name`, `/session`, `/settings`, `/reload` | Built in |

Thinking is off by default: Athena-27B was tuned for fast agent turns with thinking off, and in our tests thinking
roughly doubled task time without solving more coding tasks.

## Optional tools (not enabled by default)

`harness-ext/athena.ts` adds web search and fetch, a task list, memory, skills and session search. Athena picks the
right one reliably in our tests, but enabling them cost a few points on our coding suite, so they are opt-in until
that is resolved: `athena -e harness-ext/athena.ts`.

- Web fetch reads public addresses only. Every connection and redirect is checked; local, private and special
  IPv4/IPv6 ranges are refused. Web search and fetch contact the search service and the sites you ask about.
- Memory and skills are shown to the model in every later session, so each change asks for your approval first. In
  one-shot mode (`-p`) nobody can approve, so changes are refused unless you start with `ATHENA_AUTO_MEMORY=1`.
- Skills the agent writes load in later sessions (or after `/reload`).

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `ATHENA_URL` | from `.env` | Your Athena endpoint |
| `ATHENA_MODEL` | `athena` | Model id on the endpoint |
| `ATHENA_THINKING` | `off` | Starting thinking level |
| `ATHENA_CONTEXT` | `131072` | Context window in tokens (model maximum 262144) |
| `ATHENA_SKILLS` | `0` | `1` loads skills from `~/.agents/skills` |
| `ATHENA_ALLOW_ANYWHERE` | `0` | `1` allows running in `/`, your home folder or the harness folder |
| `ATHENA_DATE` | `1` | `0` leaves today's date out of the prompt |
| `ATHENA_AUTO_MEMORY` | `0` | `1` lets the optional memory and skill tools save without asking |

Safety defaults: your API keys and the launcher's settings are removed from the environment of the model's shell;
the harness itself never contacts any third party (no update checks, bug reports are saved locally as a zip);
self-update is disabled.

The model's shell runs as you, so it can read any file you can, including `.env`. Keep other secrets out of that file,
and run Athena in a container or VM when you work on code you do not trust.

## Tests

After the first build: `node tests/test_private_addr.mjs` (address filter), `node tests/test_memory_skills.mjs`
(approval for memory and skills) and `node tests/test_web_tools.mjs` (web fetch end to end; needs network).

## Updating the core

The core version is pinned in `harness/package.json`. To move to a newer release, change the version, run
`npm install --package-lock-only` in `harness/`, delete `athena-harness/`, and run `python3 tools/build_harness.py`.
Every patch checks its exact match count, so an incompatible upstream change stops the build instead of shipping a
half-patched harness.

## Licence

MIT (see `LICENSE`). The harness core installed by the build is MIT-licensed by its authors; its licence is in
`licenses/UPSTREAM-MIT-LICENSE` and is included in every build.
