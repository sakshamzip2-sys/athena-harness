/**
 * Athena harness slash commands (Linear OC-186), named after Claude Code's commands
 * (code.claude.com/docs/en/commands, read 2026-11-18). Commands only: no tools, no prompt hooks, so what the model
 * receives is byte-identical with or without this file. Built-in commands already cover /compact, /copy, /export,
 * /model, /resume, /fork, /tree, /login, /logout, /reload, /session, /name, /settings, /thinking, /new, /quit.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LEVELS = ["off", "low", "medium", "high"] as const;
const BUDGET: Record<string, string> = { off: "no thinking", low: "~4k tokens", medium: "~8k tokens", high: "~16k tokens" };

export default function (pi: ExtensionAPI) {
  pi.registerCommand("clear", {
    description: "Start a new conversation with empty context (same as /new)",
    handler: async (_args, ctx) => { await ctx.newSession(); },
  });

  pi.registerCommand("effort", {
    description: "Set thinking: off, low (~4k), medium (~8k), high (~16k); 'status' shows it",
    getArgumentCompletions: (p) => [...LEVELS, "status"].filter((l) => l.startsWith(p)).map((l) => ({ value: l, label: l })),
    handler: async (args, ctx) => {
      let level = args.trim().toLowerCase();
      if (level === "status") {
        const cur = pi.getThinkingLevel();
        return ctx.ui.notify(`Thinking: ${cur} (${BUDGET[cur] ?? cur})`, "info");
      }
      if (!level) level = (await ctx.ui.select("Thinking level", LEVELS.map((l) => `${l}  ${BUDGET[l]}`)))?.split(" ")[0] ?? "";
      if (!level) return;
      if (!(LEVELS as readonly string[]).includes(level)) return ctx.ui.notify(`Unknown level '${level}'. Use: ${LEVELS.join(", ")}`, "error");
      pi.setThinkingLevel(level as any);
      ctx.ui.notify(`Thinking set to ${level} (${BUDGET[level]})`, "info");
    },
  });

  pi.registerCommand("context", {
    description: "Show how much of the context window this conversation uses",
    handler: async (_args, ctx) => {
      const u = ctx.getContextUsage();
      if (!u) return ctx.ui.notify("Context usage is not known yet (send a message first).", "info");
      const pct = u.percent == null ? "?" : u.percent.toFixed(1);
      const bar = u.percent == null ? "" : "█".repeat(Math.round(u.percent / 5)).padEnd(20, "░");
      ctx.ui.notify(`Context: ${u.tokens ?? "?"} / ${u.contextWindow} tokens (${pct}%) ${bar}\n` +
        "Auto-compaction runs near the limit; /compact [focus] compacts now, /clear starts fresh.", "info");
    },
  });

  pi.registerCommand("status", {
    description: "Show model, thinking level, context use and working directory",
    handler: async (_args, ctx) => {
      const u = ctx.getContextUsage();
      ctx.ui.notify([
        `Model: ${ctx.model?.name ?? ctx.model?.id ?? "?"}`,
        `Thinking: ${pi.getThinkingLevel()} (${BUDGET[pi.getThinkingLevel()] ?? ""})`,
        `Context: ${u?.tokens ?? "?"} / ${u?.contextWindow ?? "?"} tokens`,
        `Directory: ${ctx.cwd}`,
        `Tools: ${pi.getActiveTools().join(", ")}`,
      ].join("\n"), "info");
    },
  });

  pi.registerCommand("diff", {
    description: "Show uncommitted changes in this project (git diff)",
    handler: async (_args, ctx) => {
      const stat = await pi.exec("git", ["diff", "HEAD", "--stat"], { cwd: ctx.cwd });
      if (stat.code !== 0) return ctx.ui.notify("Not a git repository (or no commits yet).", "warning");
      if (!stat.stdout.trim()) return ctx.ui.notify("No uncommitted changes.", "info");
      const full = await pi.exec("git", ["diff", "HEAD"], { cwd: ctx.cwd });
      await ctx.ui.editor("git diff HEAD (read only; Esc to close)", stat.stdout + "\n" + full.stdout);
    },
  });

  pi.registerCommand("init", {
    description: "Write an AGENTS.md guide for this project (build, test, conventions)",
    handler: async () => {
      pi.sendUserMessage("Create or update AGENTS.md in the project root: a short guide for coding agents. Read the " +
        "project first (README, package/build files, test setup, CI config). Include: what the project is, how to " +
        "install, build, run and test it (exact commands, verified by running them where cheap), code layout, " +
        "conventions you observed, and gotchas. Under 150 lines; only facts you can verify from the repo.");
    },
  });

  pi.registerCommand("doctor", {
    description: "Check the Athena setup: endpoint, model, git, web tools",
    handler: async (_args, ctx) => {
      const lines: string[] = [];
      const base = (ctx.model as any)?.baseUrl?.replace(/\/v1\/?$/, "");
      try {
        const t = Date.now();
        const r = base ? await fetch(base + "/health", { signal: AbortSignal.timeout(15000) }) : undefined;
        lines.push(r?.ok ? `✓ Athena endpoint reachable (${Date.now() - t} ms)` : `✗ Athena endpoint: HTTP ${r?.status ?? "no URL"} (it may be starting; first reply can take a few minutes)`);
      } catch (e) {
        lines.push(`✗ Athena endpoint not reachable: ${(e as Error).message}`);
      }
      lines.push(`✓ Model: ${ctx.model?.name ?? "?"}, context window ${ctx.getContextUsage()?.contextWindow ?? "?"}`);
      const git = await pi.exec("git", ["--version"]);
      lines.push(git.code === 0 ? `✓ ${git.stdout.trim()}` : "✗ git not found");
      const ar = await pi.exec("agent-reach", ["--help"]).catch(() => ({ code: 1 }) as any);
      lines.push(ar.code === 0 ? "✓ agent-reach found (web search backend)" : "• agent-reach not found (web tools fall back to DuckDuckGo)");
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("help", {
    description: "List the available slash commands",
    handler: async (_args, ctx) => {
      const cmds = pi.getCommands().slice().sort((a: any, b: any) => a.name.localeCompare(b.name));
      ctx.ui.notify("Commands:\n" + cmds.map((c: any) => `/${c.name}  ${c.description ?? ""}`).join("\n") +
        "\n\nBuilt in: /new /compact /copy /export /model /resume /fork /tree /name /session /settings /thinking " +
        "/reload /hotkeys /login /logout /quit\nKeys: Shift+Tab cycles thinking, Esc interrupts, Ctrl+C twice quits.", "info");
    },
  });
}
